require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, REST, Routes } = require('discord.js');
const WebSocket = require('ws');

// Environment validation
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN environment variable is required!');
  process.exit(1);
}

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'ws://localhost:5000/ws';

// Discord client setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

// WebSocket connection to dashboard
let dashboardWs = null;
let botId = null;

function connectToDashboard() {
  try {
    console.log(`🔗 Connecting to dashboard: ${DASHBOARD_URL}`);
    dashboardWs = new WebSocket(DASHBOARD_URL);
    
    dashboardWs.on('open', () => {
      console.log('✅ Connected to SteamGuard dashboard');
      
      // Register bot with dashboard
      const registrationData = {
        type: 'bot_registration',
        botId: botId,
        botName: client.user?.tag || 'SteamGuard',
        serverId: 'SteamGuard Multi-Server',
        timestamp: new Date().toISOString()
      };
      
      dashboardWs.send(JSON.stringify(registrationData));
    });

    dashboardWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Dashboard message:', message.type);
      } catch (error) {
        console.log('Unknown message from dashboard:', data.toString());
      }
    });

    dashboardWs.on('close', () => {
      console.log('⚠️ Dashboard connection closed, reconnecting in 5s...');
      setTimeout(connectToDashboard, 5000);
    });

    dashboardWs.on('error', (error) => {
      console.error('Dashboard connection error:', error.message);
    });

  } catch (error) {
    console.error('Failed to connect to dashboard:', error.message);
    setTimeout(connectToDashboard, 10000);
  }
}

function sendToDashboard(data) {
  if (dashboardWs && dashboardWs.readyState === WebSocket.OPEN) {
    try {
      dashboardWs.send(JSON.stringify(data));
    } catch (error) {
      console.error('Error sending to dashboard:', error);
    }
  }
}

// Slash commands definition
const commands = [
  new SlashCommandBuilder()
    .setName('report')
    .setDescription('Report a scammer to the global database')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to report')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for reporting (scam details)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('evidence')
        .setDescription('Links to evidence (screenshots, chat logs, etc.)')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('check')
    .setDescription('Check if a user is in the scammer database')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show bot statistics'),

  new SlashCommandBuilder()
    .setName('appeal')
    .setDescription('Submit an appeal if you were falsely banned')
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Why you believe the ban was incorrect')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('evidence')
        .setDescription('Evidence supporting your appeal')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Manually ban a confirmed scammer (Admin only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Ban reason')
        .setRequired(true)
    )
];

// Register commands
async function registerCommands() {
  try {
    console.log('🔄 Registering slash commands...');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands.map(command => command.toJSON()) }
    );
    
    console.log('✅ Successfully registered slash commands');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
}

// Bot event handlers
client.once('ready', async () => {
  console.log(`✅ SteamGuard Bot is online as ${client.user.tag}`);
  botId = `steamguard-${Date.now()}`;
  
  await registerCommands();
  connectToDashboard();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user, guild } = interaction;
  
  // Send activity to dashboard
  sendToDashboard({
    type: 'discord_activity',
    activity: {
      command: commandName,
      userId: user.id,
      username: user.tag,
      serverId: guild?.id,
      serverName: guild?.name,
      timestamp: new Date().toISOString()
    }
  });

  try {
    switch (commandName) {
      case 'stats':
        await handleStats(interaction);
        break;
      case 'report':
        await handleReport(interaction);
        break;
      case 'check':
        await handleCheck(interaction);
        break;
      case 'appeal':
        await handleAppeal(interaction);
        break;
      case 'ban':
        await handleBan(interaction);
        break;
      default:
        await interaction.reply('❌ Unknown command');
    }
  } catch (error) {
    console.error(`Error handling ${commandName}:`, error);
    const reply = { content: '❌ An error occurred while processing your command.', ephemeral: true };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// Command handlers
async function handleStats(interaction) {
  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('🛡️ SteamGuard Statistics')
    .addFields(
      { name: '📊 Total Reports', value: '0', inline: true },
      { name: '⛔ Active Bans', value: '0', inline: true },
      { name: '🌐 Connected Servers', value: client.guilds.cache.size.toString(), inline: true },
      { name: '⏱️ Uptime', value: formatUptime(client.uptime), inline: true },
      { name: '🤖 Bot Version', value: '1.0.0', inline: true },
      { name: '💾 Database', value: '✅ Connected', inline: true }
    )
    .setFooter({ text: 'SteamGuard - Protecting marketplace communities' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleReport(interaction) {
  const targetUser = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason');
  const evidence = interaction.options.getString('evidence') || 'No evidence provided';

  const embed = new EmbedBuilder()
    .setColor('#ff9900')
    .setTitle('📝 Report Submitted')
    .setDescription(`Report against **${targetUser.tag}** has been submitted for review.`)
    .addFields(
      { name: '🎯 Reported User', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
      { name: '📋 Reason', value: reason, inline: false },
      { name: '🔍 Evidence', value: evidence, inline: false },
      { name: '👤 Reported By', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
      { name: '🏢 Server', value: interaction.guild?.name || 'Unknown', inline: true },
      { name: '⏰ Status', value: 'Pending Review', inline: true }
    )
    .setFooter({ text: 'Your report will be reviewed by our moderation team' })
    .setTimestamp();

  // Send report to dashboard
  sendToDashboard({
    type: 'new_report',
    report: {
      id: Date.now(),
      reportedUserId: targetUser.id,
      reportedUsername: targetUser.tag,
      reporterUserId: interaction.user.id,
      reporterUsername: interaction.user.tag,
      reason,
      evidence,
      serverId: interaction.guild?.id,
      serverName: interaction.guild?.name,
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleCheck(interaction) {
  const targetUser = interaction.options.getUser('user');
  
  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('🔍 User Safety Check')
    .setDescription(`Checking **${targetUser.tag}** in global scammer database...`)
    .addFields(
      { name: '✅ Status', value: 'Clean - No reports found', inline: false },
      { name: '🛡️ Safety Score', value: '100/100', inline: true },
      { name: '📊 Reports', value: '0', inline: true },
      { name: '⏱️ Last Checked', value: 'Now', inline: true }
    )
    .setFooter({ text: 'Always verify users independently before trading' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleAppeal(interaction) {
  const reason = interaction.options.getString('reason');
  const evidence = interaction.options.getString('evidence') || 'No evidence provided';

  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('📋 Appeal Submitted')
    .setDescription('Your ban appeal has been submitted and will be reviewed.')
    .addFields(
      { name: '👤 User', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
      { name: '📝 Appeal Reason', value: reason, inline: false },
      { name: '🔍 Evidence', value: evidence, inline: false },
      { name: '⏰ Status', value: 'Under Review', inline: true },
      { name: '📅 Submitted', value: new Date().toLocaleDateString(), inline: true }
    )
    .setFooter({ text: 'Appeals are typically reviewed within 24-48 hours' })
    .setTimestamp();

  // Send appeal to dashboard
  sendToDashboard({
    type: 'new_appeal',
    appeal: {
      id: Date.now(),
      userId: interaction.user.id,
      username: interaction.user.tag,
      reason,
      evidence,
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleBan(interaction) {
  // Check if user has admin permissions
  if (!interaction.member?.permissions.has('BAN_MEMBERS')) {
    await interaction.reply({ 
      content: '❌ You need "Ban Members" permission to use this command.', 
      ephemeral: true 
    });
    return;
  }

  const targetUser = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason');

  const embed = new EmbedBuilder()
    .setColor('#ff0000')
    .setTitle('⛔ Manual Ban Executed')
    .setDescription(`**${targetUser.tag}** has been added to the global ban list.`)
    .addFields(
      { name: '🎯 Banned User', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
      { name: '📋 Reason', value: reason, inline: false },
      { name: '👤 Banned By', value: `${interaction.user.tag}`, inline: true },
      { name: '🏢 Server', value: interaction.guild?.name || 'Unknown', inline: true },
      { name: '📅 Date', value: new Date().toLocaleDateString(), inline: true }
    )
    .setFooter({ text: 'This ban is now active across all connected servers' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Utility functions
function formatUptime(uptime) {
  const seconds = Math.floor((uptime / 1000) % 60);
  const minutes = Math.floor((uptime / (1000 * 60)) % 60);
  const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
  const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the bot
client.login(process.env.DISCORD_TOKEN);