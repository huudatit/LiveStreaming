# LiveKit Webhook Setup

## Webhook đã được implement! 🎉

Endpoint: `POST http://your-backend-url/api/livekit/webhook`

## Các events được xử lý:

1. **`ingress_ended`** - OBS ngắt kết nối
   - Tự động set `stream.isLive = false`
   - Set `stream.status = "ended"`
   - Ghi lại `endedAt`
   - Emit socket event cho viewers

2. **`room_finished`** - Room kết thúc 
   - Tự động end stream trong database

3. **`participant_left`** - Host rời phòng
   - Có grace period 30 giây
   - Tự động end nếu host không reconnect

## Cách configure:

### Option 1: LiveKit Cloud Dashboard
1. Vào https://cloud.livekit.io
2. Chọn project của bạn
3. Settings → Webhooks
4. Add webhook URL: `https://your-domain.com/api/livekit/webhook`
5. Enable events: `ingress_ended`, `room_finished`, `participant_left`

### Option 2: Self-hosted LiveKit
Thêm vào config file:

```yaml
webhook:
  urls:
    - https://your-backend-url/api/livekit/webhook
  api_key: <your_api_key>
```

## Testing locally with ngrok:

```bash
# 1. Install ngrok
npm install -g ngrok

# 2. Expose backend port
ngrok http 5000

# 3. Copy the https URL (e.g., https://abc123.ngrok.io)
# 4. Add to LiveKit webhook: https://abc123.ngrok.io/api/livekit/webhook
```

## Verify webhook is working:

Check backend logs for:
- `📡 LiveKit Webhook: ingress_ended`
- `✅ Stream ended (OBS disconnected): <title>`

## Fallback: Manual cleanup script

Nếu không muốn dùng webhook, có thể chạy cron job:

```javascript
// Chạy mỗi 1 phút
setInterval(async () => {
  const liveStreams = await Stream.find({ isLive: true });
  
  for (const stream of liveStreams) {
    const roomExists = await checkIfRoomExists(stream.roomName);
    if (!roomExists) {
      stream.isLive = false;
      stream.status = "ended";
      stream.endedAt = new Date();
      await stream.save();
    }
  }
}, 60000);
```
