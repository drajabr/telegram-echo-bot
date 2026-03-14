import { Bot, Composer, Context } from "grammy";
import { ParseModeFlavor, parseMode } from "@grammyjs/parse-mode";
import db from "./database";

import bot_token_handler from "./handlers/bot_token";
import get_chat_handler from "./handlers/get_chat";
import help_handler from "./handlers/help";
import message_handler from "./handlers/message";
import owner_only from "./handlers/owner_only";
import rem_chat_handler from "./handlers/rem_chat";
import set_chat_handler from "./handlers/set_chat";
import set_owner_handler from "./handlers/set_owner";
import start_handler from "./handlers/start";
import callback_handler from "./handlers/callback";

export type BotContext = ParseModeFlavor<Context>;

const composer = new Composer<BotContext>();

export const WEBHOOK_HOST = process.env.WEBHOOK_HOST;
export const bots = new Map<string, Bot<BotContext>>();

export const botCreator = (token: string) => {
    const bot = new Bot<BotContext>(token, {
        client: {
            canUseWebhookReply: (method) => method === "sendChatAction"
        }
    });
    bot.api.config.use(parseMode("HTML"));
    bot.api.setMyCommands([
        {
            command: "start",
            description: "Start the bot"
        },
        {
            command: "help",
            description: "Show help message"
        },
        {
            command: "set",
            description: "Set a new chat forwarding"
        },
        {
            command: "get",
            description: "Get a existing setting"
        },
        {
            command: "rem",
            description: "Remove a chat forwarding"
        },
        {
            command: "set_owner",
            description: "Set the owner of the bot"
        }
    ]);
    bots.set(token, bot);
    bot.use(composer);
    return bot;
};

const wrapper =
    (handler: (ctx: BotContext) => Promise<void>) =>
    async (ctx: BotContext) => {
        handler(ctx).catch((err) => {
            console.error(`Error in ${handler.name}: ${err}`);
            ctx.reply("An error has occurred. Please try again later.");
        });
    };

const privateChat = composer.chatType("private");

privateChat.command("start", wrapper(start_handler));
privateChat.command(["set_owner", "setowner"], wrapper(set_owner_handler));
privateChat.command(["help", "settings"], wrapper(help_handler));

privateChat.command("set").filter(owner_only, wrapper(set_chat_handler));
privateChat.command("get").filter(owner_only, wrapper(get_chat_handler));
privateChat.command("rem").filter(owner_only, wrapper(rem_chat_handler));

privateChat.on("callback_query:data", wrapper(callback_handler));

privateChat.on("msg:text", wrapper(async (ctx: BotContext) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const botId = ctx.me.id;
    const owner = await db.getOwner(botId);
    if (owner !== userId) return;

    const state = await db.getUserState(botId, userId);
    if (!state) return;

    const text = ctx.message?.text;
    const forwardedChat = ctx.message?.forward_origin;

    if (state === "waiting_from_chat") {
        let chatId: string;

        if (forwardedChat && 'chat' in forwardedChat) {
            // Forwarded message
            chatId = String(forwardedChat.chat.id);
        } else if (text) {
            // Manual input
            chatId = text.trim();
        } else {
            return;
        }

        await ctx.reply(
            `Source chat received: ${chatId}\n\nNow enter the destination chat ID:`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Cancel", callback_data: "menu" }]
                    ]
                }
            }
        );
        await db.setUserState(botId, userId, `waiting_to_chat:${chatId}`);
    } else if (state.startsWith("waiting_to_chat:")) {
        const fromChatId = state.split(":")[1];
        let toChatId: string;

        if (text) {
            toChatId = text.trim();
        } else {
            return;
        }

        await ctx.reply(
            `Setting up forwarding:\nFrom: ${fromChatId}\nTo: ${toChatId}\n\nConfirm?`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ Confirm", callback_data: `confirm_set:${fromChatId}:${toChatId}` },
                            { text: "❌ Cancel", callback_data: "menu" }
                        ]
                    ]
                }
            }
        );
        await db.clearUserState(botId, userId);
    }
}));

privateChat.on("msg:text").filter(
    // @ts-ignore
    (ctx) => ctx.msg.forward_from?.username?.toLowerCase() === "botfather",
    wrapper(bot_token_handler)
);

composer.on("msg", message_handler);

export default composer;
