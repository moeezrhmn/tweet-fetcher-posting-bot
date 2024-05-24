const express = require("express");
const axios = require("axios");
const userDetails = require("../model/userDetails");
const bodyParser = require("body-parser");
const cron = require("node-cron");
const puppeteer = require("puppeteer");
const fs = require("fs");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const X = require("../twitterutils/index");
const path = require("path");
const { cleanItem } = require("../twitterutils/clean_html");
const { fetch_tweet } = require("../twitterutils/fetch_tweet");
require("dotenv").config();

const  { getRandImage, downloadImage, fetchTweets } = require("../utils/helpers");

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
          tweet_id
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
    console.log("New tweets Fetched:", newTweets);

    console.log("Tweets data saved to the database ");
  } catch (error) {
    console.error("Error in saveTweetsToDatabaseAndLogin method :", error.message);
  }
}

async function getReadyAndTweet(newTweets) {
  // if(newTweets && newTweets.length == 0 ) return;
  console.log("getting ready to tweet.");
  for (const tweet of newTweets) {
   const imagePath = await getRandImage();
   
    console.log("Image path ", imagePath);
    let content = `${tweet.tweet} \n`;
    await tweeting({ contents: content, imgpath: imagePath, tweet_obj:tweet });
  }
}

async function tweeting({ contents, imgpath = "", tweet_obj }) {
  console.log("now sending tweet");
  const client = new X({ debug: true });

  
  console.log("Logged in!");
   try {
      await client.init({ username:tweet_obj?.username || '' , tweet_id:tweet_obj?.tweet_id || '', type:'reply' });
      await client.login({
      email: process.env.USER_EMAIL,
      password: process.env.USER_PASSWORD,
      username: process.env.USER_NAME,
      });
      await client
      .reply_tweet({ content: contents, image_path: imgpath })
      .then((res) => {
         client.browser.close();
         console.log("reply tweet proceeded");
      });
   } catch (error) {
      client.browser.close();
   }
}

async function doNewTweet(){
   console.log("NEW TWEET PORCESSING START ");

   var clientNew = new X({ debug: true });
   console.log("Logged in!");

    try {
       await clientNew.init({username:'', tweet_id:'', type:'new_tweet'});
       await clientNew.login({
       email: process.env.USER_EMAIL,
       password: process.env.USER_PASSWORD,
       username: process.env.USER_NAME,
       });
       await clientNew.tweet({ content: 'New Tweet done after it reply automatically 2' })
           .then((res) => {
            clientNew.browser.close();
            console.log('New Tweet done successfully.')
           });
    } catch (error) {
       clientNew.browser.close();
    }
}






//  CRON JOBS
cron.schedule("*/1 * * * *", async () => {
  try {
    await saveTweetsToDatabaseAndLogin();
  } catch (error) {
    console.error("Error in cron job for Reply Tweet :", error.message);
  }
});

cron.schedule("*/2 * * * *", async () => {
  try {
    await doNewTweet()
  } catch (error) {
    console.error("Error in cron job for New Tweet:", error.message);
  }
});




// SERVER LISTENING  
app.listen(port, () => {
  console.log(`Server is running on localhost:${port}`);
});

module.exports = app;
