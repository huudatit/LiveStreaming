# 🎬 Real-Time Interactive Live Streaming System

A full-stack web application that enables real-time video streaming with interactive features such as live chat and reactions.  
Built using **React TypeScript**, **Node.js (ESM)**, **SRS (Simple Realtime Server)**, and **MongoDB**.

---

## 🧠 Overview

This project was developed as part of the final coursework for **NT536 – Computer Networks and Multimedia Systems**.  
It demonstrates a modern architecture for low-latency live streaming, allowing a streamer to broadcast via OBS while viewers watch and interact in real-time.

---

## 🚀 Features

### 🎯 Core (70%)
- **User Authentication** – Register, login, and JWT-based authentication.
- **Live Stream Broadcasting** – Streamers can broadcast from OBS using their unique stream key.
- **Live Stream Viewing** – Viewers can watch real-time HLS video streams from the SRS server.
- **Live Chat** – Two-way real-time chat between viewers and streamers via Socket.IO.

### ⚡ Advanced (30%)
- **Live Reactions** – Floating emojis/reactions overlay on video (planned).
- **Viewer Counter** – Real-time viewer count display (planned).
- **Adaptive Bitrate Streaming (ABR)** – Multi-quality transcoding using SRS (configurable).
- **Screen Sharing** – Option for streamers to share screens instead of webcam (future).

### 🌟 Bonus
- **VOD (Video on Demand)** – Record and replay past live streams.
- **Notification System** – Notify followers when a streamer goes live.

---

## 🏗️ Architecture

