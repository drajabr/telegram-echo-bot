import { BotContext } from "../bot";
import db from "../database";

export default async function start_handler(ctx: BotContext) {
    const userId = ctx.from?.id;
    const botId = ctx.me.id;
    const owner = await db.getOwner(botId);

    if (owner === userId) {
        // Owner menu
        await ctx.reply(
            "Welcome to your Telegram Forwarder Bot!\n\nChoose an action:",
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "Set Chat Forwarding", callback_data: "set_chat:start" }
                        ],
                        [
                            { text: "Remove Chat Forwarding", callback_data: "rem_chat:start" }
                        ],
                        [
                            { text: "View All Forwardings", callback_data: "get_chats" }
                        ],
                        [
                            { text: "Help", callback_data: "help" }
                        ]
                    ]
                }
            }
        );
    } else {
        // Non-owner welcome message
        await ctx.reply(
            `Hello, I am a bot that forwards messages from one chat to another. I only work for the owner of this bot. If you want to create a bot like me, just create a bot on @BotFather and forward the message with bot token to me. I will clone the new bot and set you as the owner of that bot.\n\nIf you are the owner of this bot, you can forward messages from one chat to another learn more using /help command.`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Create a bot",
                                url: "https://t.me/BotFather"
                            },
                            {
                                text: "Feature Request",
                                url: "https://github.com/viperadnan-git/telegram-forwarder-bot/issues"
                            }
                        ],
                        [
                            {
                                text: "Source Code",
                                url: "https://github.com/viperadnan-git/telegram-forwarder-bot"
                            }
                        ],
                        [
                            {
                                text: "Support Group",
                                url: "https://t.me/vipercommunity"
                            }
                        ]
                    ]
                }
            }
        );
    }
}
