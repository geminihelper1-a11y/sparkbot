// NETHRION BOT 2.0 - Community Message Streaks Service
const database = require('../core/database');
const logger = require('../core/logger');

class StreakService {
  /**
   * Records member activity and updates daily streak
   */
  recordActivity(userId) {
    const today = new Date().toISOString().split('T')[0];
    const streaks = database.get('streaks', {});
    const userStreak = streaks[userId] || {
      currentStreak: 0,
      highestStreak: 0,
      lastActiveDate: null,
      totalActiveDays: 0
    };

    if (userStreak.lastActiveDate === today) {
      // Already active today
      return userStreak;
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (userStreak.lastActiveDate === yesterday) {
      userStreak.currentStreak += 1;
    } else {
      userStreak.currentStreak = 1;
    }

    if (userStreak.currentStreak > userStreak.highestStreak) {
      userStreak.highestStreak = userStreak.currentStreak;
    }

    userStreak.lastActiveDate = today;
    userStreak.totalActiveDays += 1;

    streaks[userId] = userStreak;
    database.set('streaks', streaks);

    return userStreak;
  }

  getStreak(userId) {
    const streaks = database.get('streaks', {});
    return streaks[userId] || { currentStreak: 0, highestStreak: 0, totalActiveDays: 0 };
  }
}

const streakService = new StreakService();
module.exports = streakService;
