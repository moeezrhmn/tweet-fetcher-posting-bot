const express = require("express");
const axios = require("axios");
const userDetails = require("../model/userDetails");
const bodyParser = require("body-parser");
const cron = require("node-cron");
const puppeteer = require("puppeteer");
const fs = require("fs");
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const Twitter = require("../twitterutils/index");
const path = require("path");
const { cleanItem } = require("../twitterutils/clean_html");
require('dotenv').config();


const app = express();
const port = 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
   res.render("addusername");
});

app.post("/submit", async (req, res) => {
   try {
      const { username } = req.body;

      const newUser = new userDetails({
         username: username,
      });

      await newUser.save();

      res.redirect("/users");
   } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
   }
});

app.get("/users", async (req, res) => {
   try {
      const users = await userDetails.find();
      res.render("users", { users });
   } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
   }
});

app.delete("/deleteUser/:userId", async (req, res) => {
   try {
      const userId = req.params.userId;
      await userDetails.findByIdAndDelete(userId);
      res.send("User deleted successfully!");
   } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
   }
});








async function fetchTweets(username) {
   let date = new Date().toLocaleString();
   const apiUrl = `https://rss-bridge.org/bridge01/?action=display&bridge=FarsideNitterBridge&username=${username}&noreply=${date}&noretweet=on&format=Json`;

   try {
      const response = await axios.get(apiUrl);

      const items = response.data.items;
      if (items && items.length > 0) {
         let clean_item = cleanItem(items[0])
         console.log(clean_item);
         const firstItem = clean_item;
         const tweetText = firstItem.content_html;
         const tweet_id = firstItem.id;

         let tweetImage = null;
         if (firstItem.content_html) {
            const match = firstItem.content_html.match(/<img.*?src=["'](.*?)["']/);
            if (match && match[1]) {
               tweetImage = match[1];
            }
         }

         return {
            tweet: tweetText,
            image: tweetImage,
            tweet_id: tweet_id,
         };
      } else {
         return { error: true, message: `No tweets found for ${username}` };
      }
   } catch (error) {
      console.error(`Error fetching tweets for ${username}:`, error.message);
      return {
         error: true,
         message: `Error fetching tweets for ${username}: ${error.message}`,
      };
   }
}

async function fetchTweetsForUsernames(usernames) {
   const result = {};

   for (const username of usernames) {
      const tweetInfo = await fetchTweets(username);
      result[username] = tweetInfo;
   }

   return result;
}

async function saveTweetsToDatabaseAndLogin() {
   try {
      const usernamesArray = await userDetails.find().distinct("username");
      const result = await fetchTweetsForUsernames(usernamesArray);

      // Array to store new tweets
      const newTweets = [];

      for (const username of Object.keys(result)) {
         const { tweet, image, tweet_id } = result[username];
         const latestTweetIdFromDB = (
            await userDetails.findOne({ username: username })
         )?.tweet_id;

         if (latestTweetIdFromDB !== tweet_id) {
            // New tweet found
            newTweets.push({
               username,
               tweet,
               image_url: image,
               // Add other relevant details
            });
            await userDetails.updateOne(
               { username: username },
               { tweet, image_url: image, tweet_id: tweet_id }
            );
            console.log(`New tweet for ${username}: ${tweet}`);
         } else {
            // Tweet already exists
            console.log(`Tweet for ${username} is already saved`);
         }
      }
      await getReadyAndTweet(newTweets);

      // Print or use the new tweets array
      console.log("New tweets:", newTweets);

      console.log("Tweets data saved to the database and user logged in.");
   } catch (error) {
      console.error("Error in cron job:", error.message);
   }
}


async function getReadyAndTweet(newTweets) {
   // if(newTweets && newTweets.length == 0 ) return;

   for (const tweet of newTweets) {
      console.log(getRandImage())
      const imagePath = await downloadImage(!tweet.image_url ? getRandImage() : tweet.image_url, './tweetImage');
      console.log('Image path ', imagePath);
      let content = `${tweet.tweet} \n`;
      await tweeting({ contents: content, imgpath: imagePath })
   }
}
async function tweeting({ contents, imgpath = "" }) {
   const client = new Twitter({ debug: false });

   await client.init();
   await client.login({
      email: process.env.USER_EMAIL,
      password: process.env.USER_PASSWORD,
      username: process.env.USER_NAME,
   });

   console.log("Logged in!");
   await client
      .tweet({ content: contents, imgPath: imgpath })
      .then((res) => console.log("proceeded"));

}

function getRandImage() {
   const images = [
      'https://images.unsplash.com/photo-1575936123452-b67c3203c357?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aW1hZ2V8ZW58MHx8MHx8fDA%3D',
      'https://plus.unsplash.com/premium_photo-1676637000058-96549206fe71?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8aW1hZ2V8ZW58MHx8MHx8fDA%3D',
      'https://plus.unsplash.com/premium_photo-1680553492268-516537c44d91?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8aW1hZ2V8ZW58MHx8MHx8fDA%3D',
      'https://images.unsplash.com/photo-1574169208507-84376144848b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8aW1hZ2V8ZW58MHx8MHx8fDA%3D',
      'https://images.unsplash.com/photo-1595147389795-37094173bfd8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fGltYWdlfGVufDB8fDB8fHww',
      'https://plus.unsplash.com/premium_photo-1664474619075-644dd191935f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OXx8aW1hZ2V8ZW58MHx8MHx8fDA%3D',
      'https://plus.unsplash.com/premium_photo-1687382111414-7b87afa5da34?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTN8fGltYWdlfGVufDB8fDB8fHww',
      'https://images.unsplash.com/photo-1598214886806-c87b84b7078b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fGltYWdlfGVufDB8fDB8fHww',
      'https://plus.unsplash.com/premium_photo-1682513184135-b7b9b76fb4eb?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fGltYWdlfGVufDB8fDB8fHww',
      'https://images.unsplash.com/photo-1621155346337-1d19476ba7d6?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fGltYWdlfGVufDB8fDB8fHww',
   ];
   const randomIndex = Math.floor(Math.random() * images.length);
   const randomImage = images[randomIndex];
   return randomImage;
}


async function downloadImage(url, destDir, defaultExtension = '.jpg') {
   const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
   });

   const fileName = `image_${Date.now()}${defaultExtension}`;
   const destPath = path.join(destDir, fileName);

   const writer = fs.createWriteStream(destPath);

   return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      let error = null;
      writer.on('error', (err) => {
         error = err;
         writer.close();
         reject(err);
      });
      writer.on('close', () => {
         if (!error) {
            resolve(destPath);
         }
      });
   });
}


cron.schedule("*/1 * * * *", async () => {
   try {
      await saveTweetsToDatabaseAndLogin();
   } catch (error) {
      console.error("Error in cron job:", error.message);
   }
});





app.listen(port, () => {
   console.log(`Server is running at ${port}`);
});


module.exports = app;