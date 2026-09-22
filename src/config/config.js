const path=require('node:path');
require('dotenv').config();
const bool=(v,d=false)=>v===undefined?d:/^(1|true|yes|on)$/i.test(String(v));
const int=(v,d)=>v===undefined||v===''?d:Number.parseInt(v,10);
function loadConfig(env=process.env){
  const parsed={
    discordToken:String(env.DISCORD_TOKEN||''),clientId:String(env.DISCORD_CLIENT_ID||''),guildId:String(env.DISCORD_GUILD_ID||''),
    geminiKey:String(env.GEMINI_API_KEY||''),geminiModel:String(env.GEMINI_MODEL||'gemini-3.8-flash'),
    groqKey:String(env.GROQ_API_KEY||''),groqModel:String(env.GROQ_MODEL||'openai/gpt-oss-20b'),
    databasePath:String(env.DATABASE_PATH||'./data/nethrion.sqlite'),legacyDataPath:String(env.LEGACY_DATA_PATH||'./legacy/data.json'),
    defaultJavaHost:String(env.DEFAULT_JAVA_HOST||'nethrionsmp.pixelforge.gg'),defaultJavaPort:int(env.DEFAULT_JAVA_PORT,25565),
    defaultBedrockHost:String(env.DEFAULT_BEDROCK_HOST||'15.235.165.81'),defaultBedrockPort:int(env.DEFAULT_BEDROCK_PORT,26091),
    mcStatusProviderUrl:String(env.MC_STATUS_PROVIDER_URL||'https://api.mcsrvstat.us/3'),mcStatusTimeoutMs:int(env.MC_STATUS_TIMEOUT_MS,6000),
    timezone:String(env.TIMEZONE||'Asia/Karachi'),publicAiEnabled:bool(env.PUBLIC_AI_ENABLED,true),aiRequireMention:bool(env.AI_REQUIRE_MENTION,true),
    aiPublicChannels:String(env.AI_PUBLIC_CHANNELS||'').split(',').map(s=>s.trim()).filter(Boolean),
    aiGlobalDailyLimit:int(env.AI_GLOBAL_DAILY_LIMIT,200),aiGuildDailyLimit:int(env.AI_GUILD_DAILY_LIMIT,100),aiUserDailyLimit:int(env.AI_USER_DAILY_LIMIT,20),
    actionConfirmTtlSeconds:int(env.ACTION_CONFIRM_TTL_SECONDS,120),historySearchMaxMessages:int(env.HISTORY_SEARCH_MAX_MESSAGES,500),
    backupDir:String(env.BACKUP_DIR||'./backups'),backupRetention:int(env.BACKUP_RETENTION,10),dashboardPort:int(env.DASHBOARD_PORT,8787),dashboardHost:String(env.DASHBOARD_HOST||'127.0.0.1'),
    dashboardToken:String(env.DASHBOARD_TOKEN||''),features:{
      naturalActions:bool(env.FEATURE_NATURAL_ACTIONS,true),moderation:bool(env.FEATURE_MODERATION,true),antiRaid:bool(env.FEATURE_ANTI_RAID,true),tickets:bool(env.FEATURE_TICKETS,true),
      suggestions:bool(env.FEATURE_SUGGESTIONS,true),analytics:bool(env.FEATURE_ANALYTICS,true),backups:bool(env.FEATURE_BACKUPS,true),youtube:bool(env.FEATURE_YOUTUBE,false),image:bool(env.FEATURE_IMAGE,false),dashboard:bool(env.FEATURE_DASHBOARD,true)
    }
  };
  for(const [k,positive] of [['defaultJavaPort',true],['defaultBedrockPort',true],['mcStatusTimeoutMs',true],['aiGlobalDailyLimit',false],['aiGuildDailyLimit',false],['aiUserDailyLimit',false],['actionConfirmTtlSeconds',true],['historySearchMaxMessages',true],['backupRetention',true],['dashboardPort',true]]){
    if(!Number.isInteger(parsed[k])|| (positive&&parsed[k]<=0) || (!positive&&parsed[k]<0)) throw new Error(`Invalid numeric configuration: ${k}`);
  }
  parsed.databasePath=path.resolve(parsed.databasePath);parsed.legacyDataPath=path.resolve(parsed.legacyDataPath);parsed.backupDir=path.resolve(parsed.backupDir);return parsed;
}
module.exports={loadConfig};
