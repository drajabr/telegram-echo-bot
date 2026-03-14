import { BotContext } from "../bot";
import db from "../database";
import { getEntity } from "../modules/utils";

export default async function callback_handler(ctx: BotContext) {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const userId = ctx.from?.id;
    if (!userId) return;

    const botId = ctx.me.id;
    const owner = await db.getOwner(botId);
    if (owner !== userId) {
        await ctx.answerCallbackQuery("You are not the owner of this bot.");
        return;
    }

    const parts = data.split(":");
    const action = parts[0];

    try {
        switch (action) {
            case "menu":
                await showMainMenu(ctx);
                break;
            case "set_chat":
                await handleSetChat(ctx, parts);
                break;
            case "rem_chat":
                await handleRemChat(ctx, parts);
                break;
            case "get_chats":
                await handleGetChats(ctx);
                break;
            case "help":
                await handleHelp(ctx);
                break;
            case "confirm_set":
                await confirmSetChat(ctx, parts);
                break;
            case "confirm_rem":
                await confirmRemChat(ctx, parts);
                break;
            default:
                await ctx.answerCallbackQuery("Unknown action.");
        }
    } catch (error) {
        console.error("Callback error:", error);
        await ctx.answerCallbackQuery("An error occurred.");
    }

    await ctx.answerCallbackQuery();
}

async function showMainMenu(ctx: BotContext) {
    await ctx.editMessageText(
        "Choose an action:",
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
}

async function handleSetChat(ctx: BotContext, parts: string[]) {
    const step = parts[1];

    switch (step) {
        case "start":
            await ctx.editMessageText(
                "Please enter the source chat ID (from where to forward messages).\n\n" +
                "You can:\n" +
                "• Enter a chat ID directly\n" +
                "• Forward a message from that chat\n" +
                "• Use @username for channels/supergroups",
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "Cancel", callback_data: "menu" }]
                        ]
                    }
                }
            );
            // Set user state for waiting for from_chat_id
            await db.setUserState(ctx.me.id, ctx.from!.id, "waiting_from_chat");
            break;

        case "from_received":
            const fromChatId = parts[2];
            await ctx.editMessageText(
                `Source chat set to: ${fromChatId}\n\n` +
                "Now enter the destination chat ID (where to forward messages).\n\n" +
                "You can:\n" +
                "• Enter a chat ID directly\n" +
                "• Use @username for channels/supergroups",
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "Cancel", callback_data: "menu" }]
                        ]
                    }
                }
            );
            await db.setUserState(ctx.me.id, ctx.from!.id, `waiting_to_chat:${fromChatId}`);
            break;
    }
}

async function handleRemChat(ctx: BotContext, parts: string[]) {
    const step = parts[1];

    if (step === "start") {
        const botId = ctx.me.id;
        const allMappings = await db.getAllChatMap(botId);

        if (Object.keys(allMappings).length === 0) {
            await ctx.editMessageText(
                "No chat forwardings are currently set up.",
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "Back to Menu", callback_data: "menu" }]
                        ]
                    }
                }
            );
            return;
        }

        let message = "Select a forwarding to remove:\n\n";
        const keyboard: any[] = [];

        for (const fromChat in allMappings) {
            const toChats = allMappings[fromChat];
            if (toChats && toChats.length > 0) {
                message += `From ${fromChat}:\n`;
                toChats.forEach(toChat => {
                    message += `  → ${toChat}\n`;
                    keyboard.push([
                        {
                            text: `Remove ${fromChat} → ${toChat}`,
                            callback_data: `confirm_rem:${fromChat}:${toChat}`
                        }
                    ]);
                });
                message += "\n";
            }
        }

        keyboard.push([{ text: "Back to Menu", callback_data: "menu" }]);

        await ctx.editMessageText(message, {
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    }
}

async function handleGetChats(ctx: BotContext) {
    const botId = ctx.me.id;
    const allMappings = await db.getAllChatMap(botId);

    let message = "Current chat forwardings:\n\n";

    if (Object.keys(allMappings).length === 0) {
        message = "No chat forwardings are currently set up.";
    } else {
        for (const fromChat in allMappings) {
            const toChats = allMappings[fromChat];
            if (toChats && toChats.length > 0) {
                message += `From ${fromChat}:\n`;
                toChats.forEach(toChat => {
                    message += `  → ${toChat}\n`;
                });
                message += "\n";
            }
        }
    }

    await ctx.editMessageText(message, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Back to Menu", callback_data: "menu" }]
            ]
        }
    });
}

async function confirmSetChat(ctx: BotContext, parts: string[]) {
    const fromChatId = parts[1];
    const toChatId = parts[2];

    // Validate chats
    const fromEntity = await getEntity(ctx, fromChatId);
    const toEntity = await getEntity(ctx, toChatId);

    if (!fromEntity) {
        await ctx.editMessageText(
            `❌ Could not access source chat: ${fromChatId}\n\n` +
            "Make sure the chat ID is correct and the bot has access to the chat.",
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Try Again", callback_data: "set_chat:start" }],
                        [{ text: "Back to Menu", callback_data: "menu" }]
                    ]
                }
            }
        );
        return;
    }

    if (!toEntity) {
        await ctx.editMessageText(
            `❌ Could not access destination chat: ${toChatId}\n\n` +
            "Make sure the chat ID is correct and the bot has access to the chat.",
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Try Again", callback_data: "set_chat:start" }],
                        [{ text: "Back to Menu", callback_data: "menu" }]
                    ]
                }
            }
        );
        return;
    }

    // Set the mapping
    await db.setChatMap(ctx.me.id, fromEntity.id, toEntity.id);

    await ctx.editMessageText(
        `✅ Forwarding enabled!\n\n` +
        `From: ${fromEntity.id} (${fromEntity.title || 'Private Chat'})\n` +
        `To: ${toEntity.id} (${toEntity.title || 'Private Chat'})`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Set Another", callback_data: "set_chat:start" }],
                    [{ text: "Back to Menu", callback_data: "menu" }]
                ]
            }
        }
    );

    // Clear user state
    await db.clearUserState(ctx.me.id, ctx.from!.id);
}

async function confirmRemChat(ctx: BotContext, parts: string[]) {
    const fromChatId = parts[1];
    const toChatId = parts[2];

    await db.remChatMap(ctx.me.id, Number(fromChatId), Number(toChatId));

    await ctx.editMessageText(
        `✅ Forwarding removed!\n\n` +
        `From: ${fromChatId}\n` +
        `To: ${toChatId}`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Remove Another", callback_data: "rem_chat:start" }],
                    [{ text: "Back to Menu", callback_data: "menu" }]
                ]
            }
        }
    );
}

async function handleHelp(ctx: BotContext) {
    const helpText = `
This bot forwards messages from one chat to another.

<b>How it works:</b>
• Set up forwarding from a source chat to one or more destination chats
• All new messages in the source chat will be automatically forwarded
• You can forward to multiple chats by setting up multiple forwardings

<b>Chat IDs:</b>
• You can use numeric chat IDs
• For channels and supergroups, you can use @username
• Forward a message from a chat to auto-detect its ID

<b>Commands:</b>
• Use the buttons below to manage your forwardings
• Or use text commands: /set, /rem, /get, /help

<b>Source:</b> https://github.com/viperadnan-git/telegram-forwarder-bot
    `;

    await ctx.editMessageText(helpText, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Back to Menu", callback_data: "menu" }]
            ]
        },
        parse_mode: "HTML"
    });
}