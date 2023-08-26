import UserModel, { IUser } from "@/backend/models/User.model"
import YoutubeChannelModel, {
    IYoutubeChannel,
} from "@/backend/models/YoutubeChannel.model"
import {
    YoutubeVideoBasicType,
    YoutubeVideoUploadDataType,
} from "@/utils/types/youtube/video"
import { ObjectId } from "mongoose"
import { makeVideoPublic, uploadVideoUnlisted } from "./youtubeHelper"
import VideoModel from "@/backend/models/YoutubeVideo.model"
import { getObjectId } from "../user.actions"

export const uploadVideoOnYoutube = async (
    videoDetails: YoutubeVideoUploadDataType,
    channelId: string,
    userid: string
): Promise<string> => {
    try {
        const { title, description, tags, videoFile, thumbnailFile } =
            videoDetails

        if (!title || !channelId || !videoFile || !thumbnailFile) {
            throw Error("Incomplete video data")
        }
        const _channelObjectId = await getObjectId(channelId)
        const channel: IYoutubeChannel | null =
            await YoutubeChannelModel.findById(_channelObjectId)
        if (!channel?.isVerified) {
            throw Error("YouTube channel is not verified")
        }
        const _userObjectId = await getObjectId(userid)
        const user: IUser | null = await UserModel.findById(_userObjectId)
        if (!user) {
            throw Error("User not found")
        }
        // TODO: check if user is editor or owner

        if (
            !channel.editors.includes(_userObjectId) &&
            !(channel.owner === _userObjectId)
        ) {
            throw Error(
                "You dont have any access to upload in this youtube channel"
            )
        }

        const { videoYoutubeId, videoURL, thumbnailURL } =
            await uploadVideoUnlisted(videoDetails, channel)
        const newVideo = new VideoModel({
            videoYoutubeId,
            title,
            video: videoURL,
            thumbnail: thumbnailURL,
            description,
            tags, // comma-separated
            isUploaded: true,
        })

        const savedVideo = await newVideo.save()
        channel.videos.push(savedVideo._id)

        // Save the updated channel
        await channel.save()
        return savedVideo.videoYoutubeId
    } catch (error) {
        console.error("Error creating YouTube channel:", error)
        throw error
    }
}

export const approveUploadedVideo = async (
    channelId: ObjectId,
    videoId: ObjectId
) => {
    try {
        const channel = await YoutubeChannelModel.findById(channelId)
        const video = await VideoModel.findById(videoId)

        if (!channel || !video) {
            throw Error("Channel or video not found")
        }

        const isSuccess = await makeVideoPublic(video.videoYoutubeId, channel)

        if (isSuccess) {
            video.isApproved = true
            await video.save()
        } else {
            throw Error("some error in approving video")
        }
    } catch (error) {
        console.error("Error in makeVideoPublicController:", error)
        throw error
    }
}
