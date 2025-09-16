# Keep Logged In - Chrome Extension

A Chrome extension that prevents session timeouts by keeping all your tabs active and maintaining login sessions automatically.

## Features

- **Automatic Session Management**: Prevents timeouts on all open tabs
- **Two Keep-Alive Methods**:
  - **Refresh Tabs**: Periodically refreshes all tabs to reset session timers
  - **Ping Only**: Sends keep-alive signals without refreshing pages (default)
- **Customizable Intervals**: Set refresh intervals from 1-60 minutes (default: 4 minutes)
- **Smart Tab Detection**: Only works on web pages, skips Chrome internal pages
- **Session Warning Detection**: Automatically clicks "extend session" buttons
- **User Activity Simulation**: Simulates mouse movements and scrolling
- **Dynamic Icon Colors**: Extension icon changes color (Green=ON, Red=OFF)
- **Easy Toggle**: Quick on/off switch via popup interface

## Installation

### Method 1: Load as Unpacked Extension (Recommended for Development)

1. **Download/Clone the Extension**:
   - Download all files to a folder on your computer
   - Or clone this repository

2. **Open Chrome Extensions Page**:
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - Or go to Menu → More Tools → Extensions

3. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**:
   - Click "Load unpacked" button
   - Select the folder containing the extension files
   - The extension should now appear in your extensions list

5. **Pin the Extension** (Optional):
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Keep Logged In" and click the pin icon

### Method 2: Create Icons

The extension includes colorful, distinctive icons. To generate them:

1. **Open the Icon Generator**:
   - Open `create-icons.html` in your web browser
   - This will display colorful icons with an orange gradient background, teal shield, and activity indicators

2. **Download the Icons**:
   - Click the download buttons to save each icon size
   - Or use "Download All Icons" to get all three at once
   - Save them as `icon16.png`, `icon48.png`, and `icon128.png` in the extension folder

The icons feature:
- Vibrant orange-to-yellow gradient background
- Teal shield with white checkmark
- Pink activity pulse indicator
- Purple connection dots (on larger sizes)
- Much more distinctive and colorful than typical extensions

## Usage

1. **Open the Extension**:
   - Click the extension icon in your Chrome toolbar
   - Or access via the puzzle piece menu

2. **Configure Settings**:
   - **Extension Active**: Toggle to enable/disable the extension
   - **Refresh Interval**: Set how often to refresh tabs (1-60 minutes)
   - **Keep Alive Method**: Choose between "Refresh Tabs" or "Ping Only"

3. **Monitor Status**:
   - Green status = Extension is active
   - Red status = Extension is inactive
   - View how many tabs are being monitored

## How It Works

### Refresh Tabs Method
- Completely reloads all tabs at the specified interval
- Most reliable for resetting session timers
- May interrupt user activity on active tabs

### Ping Only Method
- Sends keep-alive signals without refreshing
- Simulates user activity (mouse movements, scrolling)
- Sends small network requests to maintain connections
- Automatically clicks "extend session" buttons
- Less disruptive but may not work on all sites

### Smart Features
- **Tab Filtering**: Only affects web pages, skips Chrome internal pages
- **Session Detection**: Monitors for session warning dialogs
- **Timeout Extension**: Doubles detected session timeouts
- **Activity Simulation**: Creates subtle user activity signals
- **Connection Maintenance**: Sends periodic network requests

## Technical Details

### Files Structure
```
├── manifest.json       # Extension configuration
├── background.js       # Main extension logic
├── content.js         # Page interaction script
├── popup.html         # Settings interface
├── popup.js           # Settings interface logic
├── icon16.png         # 16x16 icon (create manually)
├── icon48.png         # 48x48 icon (create manually)
└── icon128.png        # 128x128 icon (create manually)
```

### Permissions Used
- `tabs`: Access to tab information and control
- `activeTab`: Interact with currently active tab
- `storage`: Save user preferences
- `background`: Run background processes
- `<all_urls>`: Access all websites for keep-alive functionality

## Troubleshooting

### Extension Not Working
1. Check that the extension is enabled in `chrome://extensions/`
2. Verify the toggle is set to "Active" in the popup
3. Check browser console for error messages

### Sessions Still Timing Out
1. Try switching to "Refresh Tabs" method
2. Reduce the refresh interval
3. Some sites may have server-side timeouts that can't be prevented

### Performance Issues
1. Increase the refresh interval
2. Use "Ping Only" method instead of "Refresh Tabs"
3. Close unnecessary tabs to reduce monitoring load

## Privacy & Security

- **No Data Collection**: Extension doesn't collect or transmit personal data
- **Local Storage Only**: Settings stored locally in Chrome
- **No External Servers**: All functionality runs locally
- **Open Source**: All code is visible and auditable

## Limitations

- Cannot prevent server-side session timeouts
- May not work on sites with advanced anti-automation measures
- Chrome internal pages (`chrome://`) are not supported
- Some corporate networks may block keep-alive requests

## Development

To modify the extension:

1. Edit the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Try different keep-alive methods
3. Adjust the refresh interval
4. Ensure all required files are present

## License

This extension is provided as-is for educational and personal use.
