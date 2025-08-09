# 🛡️ SteamGuard Discord Bot

A Discord bot for global marketplace scam prevention with real-time dashboard integration.

## 🚀 Quick Deploy (FREE)

### Railway.app (Recommended)
1. Fork this repo to your GitHub
2. Sign up at [Railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Add environment variables:
   - `DISCORD_TOKEN`: Your Discord bot token
   - `DASHBOARD_URL`: Your dashboard WebSocket URL

### Render.com (Alternative)
1. Same GitHub setup
2. Sign up at [Render.com](https://render.com)  
3. Create new "Web Service"
4. Build: `npm install`
5. Start: `npm start`
6. Add same environment variables

## 🎮 Commands

- `/stats` - Show bot statistics
- `/report @user reason` - Report a scammer
- `/check @user` - Check user safety status  
- `/appeal reason` - Submit ban appeal
- `/ban @user reason` - Manual ban (admin only)

## 🔧 Setup

1. **Create Discord Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create new application → Add bot
   - Copy bot token

2. **Set Bot Permissions**
   - OAuth2 → URL Generator
   - Scopes: `bot`, `applications.commands`
   - Permissions: Send Messages, Ban Members, Use Slash Commands

3. **Deploy**
   - Use Railway/Render with your bot token
   - Bot will be online 24/7

## 🌐 Integration

This bot connects to the SteamGuard dashboard for:
- Real-time activity monitoring
- Report management
- Ban coordination
- Statistics tracking

## 📊 Features

- **Global Scam Database**: Cross-server scammer tracking
- **Real-time Reports**: Instant report submission and review
- **Automated Bans**: Multi-server ban enforcement
- **Appeal System**: Fair process for false positives
- **Admin Controls**: Manual ban capabilities
- **Live Dashboard**: Web interface for management

## 💰 Cost: $0

Completely free using:
- Railway/Render free tiers
- Discord's free platform
- PostgreSQL database (included)

Bot runs 24/7 with no hosting costs.

## 🔗 Links

- **Dashboard**: Connect via WebSocket for real-time integration
- **Support**: Use `/appeal` command or dashboard
- **Documentation**: Full guides included

Your marketplace communities are now protected from scammers!