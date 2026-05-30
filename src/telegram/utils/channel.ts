export async function isChannelMember(
  bot: any,
  telegramId: number
) {
  try {

    const member =
      await bot.telegram.getChatMember(
        '@dimoonlab',
        telegramId
      );

    console.log('CHANNEL MEMBER:', member);

    return [
      'creator',
      'administrator',
      'member'
    ].includes(member.status);

  } catch (error) {

    console.log('CHANNEL ERROR:', error);

    return false;

  }
}