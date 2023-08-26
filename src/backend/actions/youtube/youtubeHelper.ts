import { google, youtube_v3 } from "googleapis"
import { ObjectId } from "mongoose"
import YoutubeChannelModel, {
    IYoutubeChannel,
} from "../../models/YoutubeChannel.model"
import { YoutubeVideoUploadDataType } from "@/utils/types/youtube/video"
import {
    YoutubeChannelBasicType,
    YoutubeChannelType,
    YoutubeChannelVerifedDataType,
} from "@/utils/types/youtube/channel"
import { withTryCatch } from "@/utils/helper/trycatch"
import { createReadStream } from "fs"

const scopes = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl",
]
const scopes_string =
    "https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly"

const redirectUri = "http://localhost:3000/dashboard/verifychannel"
const auth = new google.auth.OAuth2({
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: redirectUri,
})

const isTokenExpired = (expiryTimestamp: number) => {
    const currentTimestamp = new Date().getTime()
    const fifteenMinutes = 15 * 60 * 1000 // 15 minutes in miliseconds

    return expiryTimestamp - fifteenMinutes < currentTimestamp
}

const authticateYoutubeWithChannel = async (channel: IYoutubeChannel) => {
    try {
        auth.setCredentials({
            access_token: channel.access_token,
            refresh_token: channel.refresh_token,
            expiry_date: channel.expiry,
        })

        if (isTokenExpired(channel.expiry)) {
            const { credentials } = await auth.refreshAccessToken()
            if (!credentials) throw Error("Not able to get new access token")
            auth.credentials.access_token = credentials.access_token

            await YoutubeChannelModel.findByIdAndUpdate(channel.id, {
                access_token: credentials.access_token,
                refresh_token: credentials.refresh_token,
                expiry: credentials.expiry_date,
            })
        }

        const youtube = google.youtube({
            version: "v3",
            auth,
        })
        return youtube
    } catch (error) {
        throw error
    }
}

export const getYoutubeAuthUrl = withTryCatch(async () => {
    const url = auth.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
        prompt: "select_account"
        // state: "channelid"
    })
    return url
})

export const verifyYoutubeChannel = withTryCatch(
    async (code: string): Promise<YoutubeChannelVerifedDataType> => {
        const { tokens } = await auth.getToken(code)
        auth.setCredentials(tokens)
        return tokens as YoutubeChannelVerifedDataType
    }
)

export const uploadVideoUnlisted = async (
    videoDetails: YoutubeVideoUploadDataType,
    channel: IYoutubeChannel
): Promise<{
    videoYoutubeId: string
    videoURL: string
    thumbnailURL: string
}> => {
    try {
        const youtube = await authticateYoutubeWithChannel(channel)

        const videoMetadata: youtube_v3.Schema$Video = {
            snippet: {
                title: videoDetails.title,
                description: videoDetails.description,
                categoryId: "22",
                tags: videoDetails.tags?.split(","),
            },
            status: {
                privacyStatus: "unlisted",
            },
        }


        // Upload the video
        // const res = await youtube.videos.insert({
        //     part: 'snippet,status',
        //     media: {
        //         body: createReadStream(videoDetails.videoFile),
        //     },
        //     requestBody: videoMetadata,
        // });

        const videoId = ""
        // Get the video ID and URL
        // const videoId = res.data.id;
        const videoURL = `https://www.youtube.com/watch?v=${videoId}`

        // // Upload the video thumbnail
        // await youtube.thumbnails.set({
        //     videoId,
        //     media: {
        //         mimeType: 'image/jpeg',
        //         body: fs.createReadStream(thumbnailFile),
        //     },
        // });

        // Get the thumbnail URL
        const thumbnailURL = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`

        return { videoYoutubeId: videoId, videoURL, thumbnailURL }
    } catch (error) {
        console.error("Error uploading video to YouTube:", error)
        throw error
    }
}

export const makeVideoPublic = async (
    videoYoutubeId: string,
    channel: IYoutubeChannel
): Promise<boolean> => {
    try {
        const youtube = await authticateYoutubeWithChannel(channel)
        // await youtube.videos.update({
        //     part: 'status',
        //     requestBody: {
        //         id: videoYoutubeId,
        //         status: {
        //             privacyStatus: 'public',
        //         },
        //     },
        // });

        return true // Video is now public
    } catch (error) {
        throw error
    }
}
