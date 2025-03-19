# Local Video Player with Subtitle Support

A web-based local video player application with advanced subtitle features for language learning.

## Features

- **Video Playback**: Play local MP4 files with custom controls.
- **Subtitle Support**: Load and display SRT subtitle files.
- **Sentence-by-Sentence Navigation**: Navigate through subtitle sentences.
- **Repeat Functionality**: Set custom repeat counts for each subtitle segment.
- **Playback Speed Control**: Adjust playback speed (0.5x, 1.0x, 1.5x).
- **Playlist Support**: Load a folder of videos for easy switching.
- **Keyboard Shortcuts**: Control playback with keyboard shortcuts.
- **Bilingual Subtitle Support**: Displays both original and translation if available.

## How to Use

1. Open `index.html` in a modern web browser (Chrome, Firefox, Edge recommended).
2. Click "Open Folder" to select a folder containing video files.
3. Select a video from the playlist to play.
4. Click "Load Subtitle" to select an SRT subtitle file.
5. Use the controls to navigate through the video and subtitles.

## Keyboard Shortcuts

- **Space**: Play/Pause
- **Enter**: Jump to next subtitle
- **Left Arrow**: Rewind 5 seconds
- **Right Arrow**: Forward 5 seconds

## Subtitle Navigation

- Use "Jump to subtitle" dropdown to navigate to any subtitle.
- Click the backward/forward buttons to move between subtitles.
- Set repeat count to automatically repeat each subtitle segment multiple times.

## Notes

- This application runs completely client-side with no server requirements.
- For best performance, use the latest version of Chrome or Firefox.
- Large video files and folders may take a moment to load.
- Supports standard SRT subtitle format.
- Bilingual subtitles should have each language on a separate line in the SRT file.

## Browser Compatibility

This application works best in modern browsers that support the HTML5 File API and video element. Some features may not work in older browsers.

## Privacy

All processing happens locally in your browser. No data is sent to any server. 