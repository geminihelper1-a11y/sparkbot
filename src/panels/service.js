const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

function statusLabel(status) {
  return ({ ONLINE: 'Online', OFFLINE: 'Offline', UNKNOWN: 'Unknown', NOT_CONFIGURED: 'Not configured' }[status] || 'Unknown');
}

function statusMark(status) {
  return ({ ONLINE: '🟢', OFFLINE: '🔴', UNKNOWN: '🟡', NOT_CONFIGURED: '⚪' }[status] || '🟡');
}

class PanelService {
  constructor({ repos, minecraft, logger, config }) {
    this.repos = repos;
    this.minecraft = minecraft;
    this.logger = logger;
    this.config = config;
    this.client = null;
    this.updateLocks = new Set();
  }

  attachClient(client) { this.client = client; }

  panelTitle(key) {
    return ({ smp: 'NETHRION SMP', roles: 'NETHRION Notifications', ticket: 'NETHRION Support', anon: 'NETHRION Anonymous' }[key] || 'NETHRION');
  }

  async ensurePanel(guild, key, channel) {
    if (!channel?.isTextBased?.()) throw new Error('This channel cannot host a NETHRION panel.');
    const existingRef = this.repos.getPanel(guild.id, key);
    let message = null;
    if (existingRef?.channel_id === channel.id && existingRef?.message_id) {
      message = await channel.messages.fetch(existingRef.message_id).catch(() => null);
    }
    if (!message) {
      const payload = await this.buildPayload(guild, key);
      message = await channel.send(payload);
      this.repos.setPanel(guild.id, key, channel.id, message.id);
    } else {
      await this.updatePanelMessage(guild, key, message);
    }
    return message;
  }

  async buildPayload(guild, key) {
    if (key === 'smp') return { embeds: [await this.buildSmpEmbed(guild.id)], components: [this.smpButtons()] };
    if (key === 'roles') return { embeds: [this.buildRolesEmbed(guild)], components: [this.rolesMenu(guild)] };
    if (key === 'ticket') return { embeds: [this.buildTicketEmbed()], components: [this.ticketButtons()] };
    if (key === 'anon') return { embeds: [this.buildAnonEmbed()], components: [this.anonButtons()] };
    throw new Error(`Unknown panel: ${key}`);
  }

  async updatePanelMessage(guild, key, message) {
    if (!message) return false;
    if (key === 'smp') {
      await message.edit({ embeds: [await this.buildSmpEmbed(guild.id)], components: [this.smpButtons()] });
      return true;
    }
    await message.edit(await this.buildPayload(guild, key));
    return true;
  }

  async update(guildId, key) {
    if (!this.client) return false;
    const lockKey = `${guildId}:${key}`;
    if (this.updateLocks.has(lockKey)) return false;
    this.updateLocks.add(lockKey);
    try {
      const guild = this.client.guilds.cache.get(guildId);
      const ref = this.repos.getPanel(guildId, key);
      if (!guild || !ref?.channel_id || !ref?.message_id) return false;
      const channel = guild.channels.cache.get(ref.channel_id) || await guild.channels.fetch(ref.channel_id).catch(() => null);
      if (!channel?.isTextBased?.()) return false;
      const message = await channel.messages.fetch(ref.message_id).catch(() => null);
      if (!message) return false;
      return await this.updatePanelMessage(guild, key, message);
    } catch (e) {
      this.logger?.warn('Panel update failed', e?.message || e);
      return false;
    } finally {
      this.updateLocks.delete(lockKey);
    }
  }

  async refreshAllSmpPanels() {
    if (!this.client) return;
    const guilds = [...this.client.guilds.cache.values()];
    for (const guild of guilds) await this.update(guild.id, 'smp');
  }

  smpButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('nethrion_panel:smp:refresh').setLabel('Refresh').setStyle(ButtonStyle.Secondary),
    );
  }

  buildSmpEmbed(guildId) {
    return this.minecraft.checkBoth(guildId).then(data => {
      const java = data.java || {};
      const bedrock = data.bedrock || {};
      const cfg = this.minecraft.getConfig(guildId) || {};
      const javaAddress = cfg.java_host ? `${cfg.java_host}:${cfg.java_port}` : 'Not configured';
      const bedrockAddress = cfg.bedrock_host ? `${cfg.bedrock_host}:${cfg.bedrock_port}` : 'Not configured';
      const embed = new EmbedBuilder()
        .setTitle('NETHRION SMP')
        .setDescription('Live server status')
        .addFields(
          { name: 'Java', value: `${statusMark(java.status)} ${statusLabel(java.status)}${Number.isFinite(Number(java.playersOnline)) ? ` · ${Number(java.playersOnline)}/${java.playersMax == null ? '?' : Number(java.playersMax)} players` : ''}\n\`${javaAddress}\``, inline: false },
          { name: 'Bedrock', value: `${statusMark(bedrock.status)} ${statusLabel(bedrock.status)}${Number.isFinite(Number(bedrock.playersOnline)) ? ` · ${Number(bedrock.playersOnline)}/${bedrock.playersMax == null ? '?' : Number(bedrock.playersMax)} players` : ''}\n\`${bedrockAddress}\``, inline: false },
        )
        .setFooter({ text: 'Updates automatically' })
        .setTimestamp();
      return embed;
    });
  }

  buildRolesEmbed(guild) {
    return new EmbedBuilder()
      .setTitle('NETHRION Notifications')
      .setDescription('Choose a channel to toggle its notification role.')
      .setFooter({ text: 'You can change this anytime' });
  }

  rolesMenu(guild) {
    const channels = guild.channels.cache.filter(c =>
      c.type === ChannelType.GuildText && !/admin|log|ticket/i.test(c.name)
    ).first(25);
    const options = channels.length ? channels.map(c => new StringSelectMenuOptionBuilder().setLabel(`#${c.name.slice(0,90)}`).setValue(c.id)) : [new StringSelectMenuOptionBuilder().setLabel('No channels available').setValue('none').setDefault(false)];
    const menu = new StringSelectMenuBuilder().setCustomId('nethrion_panel:roles:select').setPlaceholder('Select a channel').addOptions(options);
    return new ActionRowBuilder().addComponents(menu);
  }

  buildTicketEmbed() {
    return new EmbedBuilder()
      .setTitle('NETHRION Support')
      .setDescription('Need help? Open a private support ticket.');
  }

  ticketButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('nethrion_panel:ticket:create').setLabel('Create Ticket').setStyle(ButtonStyle.Primary),
    );
  }

  buildAnonEmbed() {
    return new EmbedBuilder()
      .setTitle('NETHRION Anonymous')
      .setDescription('Send an anonymous message to this channel. Staff logs still apply.');
  }

  anonButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('nethrion_panel:anon:open').setLabel('Send Anonymous').setStyle(ButtonStyle.Secondary),
    );
  }

  async handleCommand(message, key) {
    const isOwner = message.guild.ownerId === message.author.id;
    const manage = message.member.permissions.has(PermissionFlagsBits.ManageGuild);
    const rolesManage = message.member.permissions.has(PermissionFlagsBits.ManageRoles);
    if (key === 'roles' && !rolesManage) return message.reply('Manage Roles permission required.');
    if (key !== 'roles' && !isOwner && !manage) return message.reply('Manage Server permission required.');
    const panel = await this.ensurePanel(message.guild, key, message.channel);
    this.repos.addAudit({ guildId: message.guild.id, actionId: `panel:${key}:${panel.id}`, actorId: message.author.id, request: message.content, resolvedIntent: `create ${key} panel`, toolName: `create_${key}_panel`, target: { channelId: message.channel.id }, resultState: 'SUCCESS' });
    await message.delete().catch(() => {});
    await message.channel.send({ content: `${this.panelTitle(key)} panel is ready.`, allowedMentions: { parse: [] } }).then(m => setTimeout(() => m.delete().catch(() => {}), 3500)).catch(() => {});
    return true;
  }

  async handleInteraction(i, services) {
    if (!i.customId?.startsWith('nethrion_panel:')) return false;
    const [, key, action] = i.customId.split(':');

    if (key === 'smp' && action === 'refresh') {
      await i.deferUpdate();
      await this.update(i.guild.id, 'smp');
      return true;
    }

    if (key === 'ticket' && action === 'create') {
      await i.deferReply({ ephemeral: true });
      const c = await services.tickets.open(i.guild, await i.guild.members.fetch(i.user.id));
      await i.editReply({ content: `Support ticket opened: <#${c.id}>.` });
      return true;
    }

    if (key === 'anon' && action === 'open') {
      const modal = new ModalBuilder().setCustomId(`nethrion_panel:anonmodal:${i.channel.id}`).setTitle('Anonymous message');
      const input = new TextInputBuilder().setCustomId('message').setLabel('Message').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000).setPlaceholder('Write your message');
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await i.showModal(modal);
      return true;
    }

    if (key === 'roles' && action === 'select' && i.isStringSelectMenu()) {
      const channelId = i.values[0];
      if (channelId === 'none') return i.reply({ content: 'No eligible channels are available.', ephemeral: true });
      const channel = i.guild.channels.cache.get(channelId);
      if (!channel) return i.reply({ content: 'That channel no longer exists.', ephemeral: true });
      const roleName = `Notify #${channel.name}`;
      let role = i.guild.roles.cache.find(r => r.name === roleName);
      const me = i.guild.members.me;
      if (!role) {
        if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) return i.reply({ content: 'I need Manage Roles to create notification roles.', ephemeral: true });
        if (i.guild.roles.cache.size >= 250) return i.reply({ content: 'Discord role limit reached.', ephemeral: true });
        role = await i.guild.roles.create({ name: roleName, reason: 'NETHRION notification panel' });
      }
      if (!me || role.position >= me.roles.highest.position) return i.reply({ content: 'I cannot manage that notification role because of role hierarchy.', ephemeral: true });
      const has = i.member.roles.cache.has(role.id);
      if (has) { await i.member.roles.remove(role, 'NETHRION notification panel'); return i.reply({ content: `Notifications disabled for #${channel.name}.`, ephemeral: true }); }
      await i.member.roles.add(role, 'NETHRION notification panel');
      return i.reply({ content: `Notifications enabled for #${channel.name}.`, ephemeral: true });
    }

    if (key === 'anonmodal' && i.isModalSubmit()) {
      const channelId = action;
      const channel = i.guild.channels.cache.get(channelId);
      const content = i.fields.getTextInputValue('message').replace(/@everyone|@here/g, '').trim();
      if (!channel?.isTextBased?.()) return i.reply({ content: 'Target channel is unavailable.', ephemeral: true });
      if (!content) return i.reply({ content: 'Message cannot be empty.', ephemeral: true });
      await channel.send({ content: `**Anonymous**\n> ${content.replace(/\n/g, '\n> ')}`, allowedMentions: { parse: [] } });
      return i.reply({ content: 'Anonymous message sent.', ephemeral: true });
    }

    return false;
  }
}

module.exports = { PanelService };
