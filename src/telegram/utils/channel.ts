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

    return [
      'creator',
      'administrator',
      'member'
    ].includes(member.status);

  } catch {

    return false;

  }

}