# DEBUGGING GUIDE - Finding Why Extension Stops

## 🔍 STEP-BY-STEP DEBUGGING INSTRUCTIONS

### Step 1: Reload the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Find "Keep Logged In" extension
4. Click the **RELOAD** button (circular arrow icon)

### Step 2: Open BOTH Console Windows

You need to monitor TWO console windows simultaneously:

#### A. Service Worker Console
1. On `chrome://extensions/` page, find "Keep Logged In"
2. Click the blue **"service worker"** link
3. A DevTools window will open - this shows the **background.js** logs

#### B. Offscreen Document Console  
1. In the service worker console, type this command and press Enter:
   ```javascript
   chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT']}).then(c => chrome.windows.create({url: c[0].documentUrl}))
   ```
2. This opens the offscreen.html page in a new window
3. Right-click on that page → "Inspect" → this shows the **offscreen.js** logs

### Step 3: Watch the Logs

Now you have both consoles open. Watch them closely for 2-3 minutes.

## 📋 WHAT TO LOOK FOR

### ✅ HEALTHY LOGS (What You SHOULD See)

**Service Worker Console (background.js):**
```
✅ [SW 8:45:00 | Uptime: 5s] 🚀 SERVICE WORKER STARTED!
✅ [SW 8:45:01 | Uptime: 6s] ✅ Offscreen document created successfully
✅ [SW 8:45:20 | Uptime: 25s] 💓 Keep-alive ping #1 received from offscreen
✅ [SW 8:45:20 | Uptime: 25s] Sent pong response to offscreen
✅ [SW 8:45:40 | Uptime: 45s] 💓 Keep-alive ping #2 received from offscreen
💬 [SW 8:46:00 | Uptime: 65s] Tab activated: 123
✅ [SW 8:46:00 | Uptime: 65s] 💓 Runtime keep-alive ping #3
```

**Offscreen Console (offscreen.js):**
```
🚀 [OFFSCREEN] Script loaded at: 8:45:00
✅ [OFFSCREEN 8:45:00] Connected to service worker successfully
💬 [OFFSCREEN 8:45:20] Keep-alive ping #1 (20s since last success)
✅ [OFFSCREEN 8:45:20] Runtime message succeeded: {status: 'alive'}
✅ [OFFSCREEN 8:45:20] Pong received! Success rate: 1/1
💬 [OFFSCREEN 8:45:40] Keep-alive ping #2 (20s since last success)
✅ [OFFSCREEN 8:45:40] Runtime message succeeded: {status: 'alive'}
```

### ❌ PROBLEM INDICATORS (What Shows Failure)

**1. Service Worker Idle Warning:**
```
🔥 [SW 8:45:25] CRITICAL: SERVICE WORKER IDLE FOR 25+ SECONDS - MIGHT SHUTDOWN SOON!
```
→ This means the keep-alive pings STOPPED arriving!

**2. Port Disconnection:**
```
❌ [OFFSCREEN 8:45:30] Port disconnected! Could not establish connection
⚠️ [OFFSCREEN 8:45:30] Reconnecting in 1 second... (consecutive errors: 1)
```
→ Connection to service worker was lost

**3. Runtime Message Failures:**
```
❌ [OFFSCREEN 8:45:40] Runtime message failed: Could not establish connection
⚠️ [OFFSCREEN 8:45:40] Failure rate: 5/10 pings failed
```
→ Messages can't reach the service worker

**4. Offscreen Document Missing:**
```
❌ [SW 8:46:00] ⚠️ OFFSCREEN DOCUMENT MISSING! Recreating...
```
→ The offscreen document was closed/destroyed

**5. No Messages Being Received:**
If you see the uptime increasing but NO ping messages:
```
💬 [SW 8:45:00 | Uptime: 5s] Background service worker fully initialized
💬 [SW 8:45:30 | Uptime: 35s] 🏥 SERVICE WORKER HEALTH CHECK
... (no ping messages in between)
```
→ Offscreen document isn't sending pings

### Step 4: Share Your Findings

**When reporting the issue, please provide:**

1. **Last Message Seen**: Copy the last 10-20 lines from BOTH consoles
2. **Timing**: How long did it run before stopping? (check the Uptime value)
3. **Error Messages**: Any red ❌ or yellow ⚠️ messages
4. **Statistics**: Look for messages like:
   ```
   📊 STATISTICS: Attempts=5, Success=3, Failed=2, ConsecutiveErrors=2
   ```

## 🔍 COMMON FAILURE PATTERNS

### Pattern 1: Service Worker Shuts Down Immediately
**Symptoms:**
- Service worker console shows "Uptime: 30s" then stops
- No more log messages appear
- Console shows "Service worker (inactive)"

**Likely Cause:** Offscreen document failed to create or connect

### Pattern 2: Offscreen Pings Not Reaching Service Worker
**Symptoms:**
- Offscreen console shows pings being sent
- Service worker console shows NO ping messages received
- Runtime message failures in offscreen console

**Likely Cause:** Service worker already shut down before ping arrives

### Pattern 3: Both Stop Together
**Symptoms:**
- Both consoles stop logging at same time
- No error messages, just stops

**Likely Cause:** Chrome is suspending the entire extension (possible Chrome bug or policy)

## 🧪 ADDITIONAL DIAGNOSTIC COMMANDS

Run these in the Service Worker console:

### Check Runtime Status:
```javascript
console.log('Service Worker Active:', typeof chrome !== 'undefined');
```

### Check Offscreen Document Status:
```javascript
chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT']}).then(c => console.log('Offscreen Contexts:', c));
```

### Manually Trigger Keep-Alive:
```javascript
chrome.runtime.sendMessage({action: 'testKeepAlive'}, r => console.log('Test result:', r));
```

### Check Alarms:
```javascript
chrome.alarms.getAll(alarms => console.log('Active alarms:', alarms));
```

## 📊 WHAT THE LOGS TELL US

| Log Message | Meaning | What It Indicates |
|-------------|---------|-------------------|
| `💓 Keep-alive ping received` | Service worker got ping | ✅ Working correctly |
| `Sent pong response` | Two-way communication works | ✅ Connection healthy |
| `Runtime message succeeded` | Backup communication works | ✅ Redundancy working |
| `Port disconnected` | Connection lost | ❌ Problem detected |
| `Runtime message failed` | Can't reach service worker | ❌ Service worker likely dead |
| `SERVICE WORKER IDLE FOR 25+ SECONDS` | No activity for too long | ❌ About to shutdown |
| `Uptime stops increasing` | Service worker shut down | ❌ Extension dead |

## 🎯 NEXT STEPS

After running these diagnostics:

1. Let the extension run for 2-3 minutes
2. Take screenshots of BOTH console windows
3. Note the exact timing when it stops
4. Copy all error messages
5. Report findings with:
   - "It stopped after X seconds"
   - "Last message was: [copy message]"
   - "Error seen: [copy error]"

This will help identify the EXACT point of failure and the root cause!
