// backend/src/controllers/streamController.js
import Stream from "../models/Stream.js";
import User from "../models/User.js";
import srsService from "../services/srsService.js";

// @desc    Start stream
// @route   POST /api/streams/start
// @access  Private
export const startStream = async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.user.id;

    // Check if user already streaming
    const existingStream = await Stream.findOne({
      streamer: userId,
      status: "live",
    });

    if (existingStream) {
      return res.status(400).json({
        success: false,
        message: "You already have an active stream",
      });
    }

    // Get user stream key
    const user = await User.findById(userId);
    const streamId = user.streamKey;

    // Create stream in database
    const stream = await Stream.create({
      streamId,
      title: title || "Untitled Stream",
      description: description || "",
      streamer: userId,
      status: "live",
      startedAt: new Date(),
    });

    // Update user isLive status
    user.isLive = true;
    await user.save();

    // Get streaming URLs
    const rtmpUrl = srsService.getRtmpUrl(streamId);
    const rtmpServer = srsService.getRtmpServer();
    const playUrls = srsService.getPlayUrls(streamId);

    res.status(201).json({
      success: true,
      message:
        "Stream created successfully. Start streaming with OBS or your preferred software.",
      stream: {
        id: stream._id,
        streamId: stream.streamId,
        title: stream.title,
        description: stream.description,
        status: stream.status,
        rtmpUrl,
        streamKey: streamId,
        playUrls,
      },
      instructions: {
        obs: {
          server: rtmpServer,
          streamKey: streamId,
          instructions: [
            "1. Open OBS Studio",
            "2. Go to Settings > Stream",
            "3. Service: Custom",
            `4. Server: ${rtmpServer}`,
            `5. Stream Key: ${streamId}`,
            "6. Click OK and Start Streaming",
          ],
        },
        browser: {
          hls: playUrls.hls,
          flv: playUrls.flv,
          webrtc: playUrls.webrtc,
        },
      },
    });
  } catch (error) {
    console.error("Start stream error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start stream",
      error: error.message,
    });
  }
};

// @desc    Stop stream
// @route   POST /api/streams/:streamId/stop
// @access  Private
export const stopStream = async (req, res) => {
  try {
    const { streamId } = req.params;
    const userId = req.user.id;

    // Find stream
    const stream = await Stream.findOne({ streamId });

    if (!stream) {
      return res.status(404).json({
        success: false,
        message: "Stream not found",
      });
    }

    // Check ownership
    if (stream.streamer.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to stop this stream",
      });
    }

    // Update stream
    stream.status = "ended";
    stream.endedAt = new Date();
    await stream.save();

    // Update user isLive status
    const user = await User.findById(userId);
    user.isLive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message:
        "Stream stopped successfully. Stop streaming in OBS to disconnect.",
    });
  } catch (error) {
    console.error("Stop stream error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to stop stream",
    });
  }
};

// @desc    Get stream info
// @route   GET /api/streams/:streamId
// @access  Public
export const getStream = async (req, res) => {
  try {
    const { streamId } = req.params;

    const stream = await Stream.findOne({ streamId }).populate(
      "streamer",
      "username"
    );

    if (!stream) {
      return res.status(404).json({
        success: false,
        message: "Stream not found",
      });
    }

    // Get live info from SRS
    let viewerCount = stream.viewerCount;
    let isLive = false;
    let bitrate = 0;

    try {
      const srsStream = await srsService.getStream(streamId);
      if (srsStream) {
        viewerCount = srsStream.clients || 0;
        bitrate = srsStream.kbps || 0;
        isLive = true;

        // Update viewer count in database
        stream.viewerCount = viewerCount;
        await stream.save();
      }
    } catch (error) {
      console.log("Could not fetch SRS stream info:", error.message);
    }

    res.status(200).json({
      success: true,
      stream: {
        id: stream._id,
        streamId: stream.streamId,
        title: stream.title,
        description: stream.description,
        status: isLive ? "live" : stream.status,
        viewerCount,
        bitrate,
        streamer: {
          id: stream.streamer._id,
          username: stream.streamer.username,
        },
        startedAt: stream.startedAt,
        endedAt: stream.endedAt,
        playUrls: srsService.getPlayUrls(streamId),
      },
    });
  } catch (error) {
    console.error("Get stream error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get stream info",
    });
  }
};

// @desc    Get all live streams
// @route   GET /api/streams/live
// @access  Public
export const getLiveStreams = async (req, res) => {
  try {
    // Get live streams from SRS
    const srsStreams = await srsService.getAllStreams();

    if (srsStreams.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        streams: [],
      });
    }

    // Extract stream IDs from SRS
    const liveStreamIds = srsStreams.map((s) => {
      const streamName = s.name || s.stream;
      // streamName format: "live/streamId"
      return streamName.split("/").pop();
    });

    // Get stream info from database
    const streams = await Stream.find({
      streamId: { $in: liveStreamIds },
    })
      .populate("streamer", "username")
      .sort("-startedAt");

    // Merge with SRS data
    const streamsWithViews = streams.map((stream) => {
      const srsStream = srsStreams.find((s) => {
        const streamName = s.name || s.stream;
        return streamName.endsWith(stream.streamId);
      });

      return {
        id: stream._id,
        streamId: stream.streamId,
        title: stream.title,
        description: stream.description,
        viewerCount: srsStream?.clients || stream.viewerCount || 0,
        bitrate: srsStream?.kbps || 0,
        streamer: {
          id: stream.streamer._id,
          username: stream.streamer.username,
        },
        startedAt: stream.startedAt,
        playUrls: srsService.getPlayUrls(stream.streamId),
      };
    });

    res.status(200).json({
      success: true,
      count: streamsWithViews.length,
      streams: streamsWithViews,
    });
  } catch (error) {
    console.error("Get live streams error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get live streams",
    });
  }
};

// @desc    Get SRS server status
// @route   GET /api/streams/server/status
// @access  Public
export const getServerStatus = async (req, res) => {
  try {
    const serverInfo = await srsService.getServerInfo();

    res.status(200).json({
      success: true,
      server: serverInfo,
    });
  } catch (error) {
    console.error("Get server status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get server status",
    });
  }
};
