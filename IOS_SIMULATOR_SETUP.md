# iOS Simulator Setup Guide

## Fixed Issues
✅ Backend server now listens on all network interfaces (0.0.0.0)
✅ CORS configured to accept requests from iOS simulator
✅ API URL updated to use your Mac's local IP address
✅ Capacitor configured for development mode

## Configuration Summary

### 1. Backend Server (`backend/src/index.ts`)
- Now listens on `0.0.0.0:3000` (accessible from network)
- CORS allows origins: localhost, 192.168.x.x, capacitor://, ionic://
- Server accessible at: `http://192.168.100.111:3000`

### 2. Frontend API URL (`.env.local`)
- Updated to: `VITE_API_URL=http://192.168.100.111:3000/api`
- This allows the iOS simulator to reach your Mac's backend

### 3. Capacitor Config (`capacitor.config.ts`)
- Configured with development server URL
- Enables live reload during development
- Allows HTTP connections for local development

## How to Test in iOS Simulator

1. **Ensure backend is running:**
   ```bash
   cd backend
   npm run dev
   ```
   You should see:
   - `🚀 Server running at http://localhost:3000`
   - `📱 Accessible from network at http://192.168.100.111:3000`

2. **Build and sync your app:**
   ```bash
   npm run build
   npx cap sync ios
   ```

3. **Open in Xcode:**
   ```bash
   npx cap open ios
   ```

4. **Run the app** in Xcode simulator

## Troubleshooting

### Still getting "Login Failed" or "Load Failed"?

1. **Check if backend is accessible:**
   ```bash
   curl http://192.168.100.111:3000/api/auth/test
   ```

2. **Check Xcode console logs:**
   - In Xcode, open Debug > View > Debug Console
   - Look for network errors or API request failures

3. **Verify your IP hasn't changed:**
   ```bash
   ipconfig getifaddr en0
   ```
   If different from 192.168.100.111, update `.env.local` and rebuild

4. **Check Mac firewall settings:**
   - System Settings > Network > Firewall
   - Ensure it's not blocking Node.js connections

5. **For first login:**
   - Make sure you have a test user in the database
   - Or register a new account first

### Switch between Web and Mobile Development

**For Web (browser):**
```bash
# Update .env.local
VITE_API_URL=http://localhost:3000/api
npm run dev
```

**For iOS Simulator:**
```bash
# Update .env.local
VITE_API_URL=http://192.168.100.111:3000/api
npm run build
npx cap sync ios
npx cap open ios
```

## Network Requirements

- Your Mac and simulator must be on the same network (they are, by default)
- Backend must be running while testing the app
- If you restart your Mac or change networks, your IP might change

## Next Steps

- Test login with existing credentials
- Check that all API endpoints work (expenses, revenue, services, etc.)
- Test on a physical device (requires updating IP in `.env.local`)
