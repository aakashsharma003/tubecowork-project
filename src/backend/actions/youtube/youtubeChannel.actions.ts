"use server"
import { connectToDB } from "@/backend/db"
import UserModel from "@/backend/models/User.model"
import YoutubeChannelModel from "@/backend/models/YoutubeChannel.model"
import { UserBasicDetailsType } from "@/utils/types/user"
import {
    YoutubeChannelBasicType,
    YoutubeChannelVerifedDataType,
} from "@/utils/types/youtube/channel"
import mongoose from "mongoose"
import { getYoutubeAuthUrl, verifyYoutubeChannel } from "./youtubeHelper"
import { getObjectId } from "../user.actions"

export const createYoutubeChannel = async (
    userid: string,
    channelName: string
): Promise<YoutubeChannelBasicType> => {
    try {
        await connectToDB()
        const user = await UserModel.findOne(
            new mongoose.Types.ObjectId(userid)
        )
        if (!user) {
            throw Error("User not found")
        }

        const newChannel = new YoutubeChannelModel({
            name: channelName,
            owner: user._id, // Associate the channel with the user
        })

        const savedChannel = await newChannel.save()
        user.ownedChannels.push(savedChannel._id)
        await user.save()

        return savedChannel
    } catch (error) {
        console.error("Error creating YouTube channel:", error)
        throw error
    }
}

export const getAuthUrl = async (): Promise<string> => {
    try {
        const authUrl = await getYoutubeAuthUrl()
        return authUrl
    } catch (error) {
        console.error("Error creating YouTube channel:", error)
        throw error
    }
}

export const setChannelAsVerified = async (
    channelId: string,
    verifyCode: string
): Promise<YoutubeChannelBasicType> => {
    try {
        await connectToDB()
        const channel = await YoutubeChannelModel.findById(
            new mongoose.Types.ObjectId(channelId)
        )
        if (!channel) {
            throw Error("Channel not found")
        }
        const verificationData = await verifyYoutubeChannel(verifyCode)
        console.log("verificationData", verificationData)

        channel.isVerified = true
        channel.access_token = verificationData.access_token
        channel.refresh_token = verificationData.refresh_token
        channel.expiry = verificationData.expiry_date
        await channel.save()
        return channel
    } catch (error) {
        console.error("Error creating YouTube channel:", error)
        throw error
    }
}

export const addEditorToChannel = async (
    channelId: string,
    editorEmail: string
): Promise<UserBasicDetailsType> => {
    try {
        await connectToDB()
        const _channelObjectId = await getObjectId(channelId)
        const channel = await YoutubeChannelModel.findById(_channelObjectId)
        if (!channel) {
            throw Error("YouTube channel not found")
        }
        const editor = await UserModel.findOne({ email: editorEmail })
        if (!editor) {
            throw Error("Editor user not found")
        }

        if (!channel.editors.includes(editor._id)) {
            channel.editors.push(editor._id)
            await channel.save()
        }
        if (!editor.managedChannels.includes(channel._id)) {
            editor.managedChannels.push(channel._id)
            await editor.save()
        }
        return {
            id: String(editor._id),
            name: String(editor.name),
            email: String(editor.email),
        }
    } catch (error) {
        console.error("Error creating YouTube channel:", error)
        throw error
    }
}
