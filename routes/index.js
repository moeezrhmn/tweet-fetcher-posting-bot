const express = require('express');
const axios = require('axios');
const userDetails = require('../model/userDetails')
const bodyParser = require('body-parser');
const cron = require('node-cron');
const puppeteer = require('puppeteer');





const app = express();
const port = 3000;


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/', async (req, res) => {
   res.render('addusername')
})


app.post("/submit", async (req, res) => {
   try {
      const { username } = req.body;

      const newUser = new userDetails({
         username: username,
      });

      await newUser.save();

      res.redirect('/users');
   } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
   }
});


app.get('/users', async (req, res) => {
   try {
      const users = await userDetails.find();
      res.render('users', { users });
   } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
   }
});


app.delete('/deleteUser/:userId', async (req, res) => {
   try {
      const userId = req.params.userId;
      await userDetails.findByIdAndDelete(userId);
      res.send('User deleted successfully!');
   } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
   }
});


async function fetchTweets(username) {

   let date = new Date().toLocaleString();
   const apiUrl = `https://rss-bridge.org/bridge01/?action=display&bridge=FarsideNitterBridge&username=${username}&noreply=${date}&noretweet=on&format=Json`;

   try {
      const response = await axios.get(apiUrl);

      const items = response.data.items;
      if (items && items.length > 0) {
         const firstItem = items[0];
         const tweetText = firstItem.title;
         const tweet_id = firstItem.id

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
            tweet_id: tweet_id
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
      const usernamesArray = await userDetails.find().distinct('username');
      const result = await fetchTweetsForUsernames(usernamesArray);

      // Array to store new tweets
      const newTweets = [];

      for (const username of Object.keys(result)) {
         const { tweet, image, tweet_id } = result[username];
         const latestTweetIdFromDB = (await userDetails.findOne({ username: username }))?.tweet_id;

         if (latestTweetIdFromDB !== tweet_id) {
            // New tweet found
            newTweets.push({
               username,
               tweet,
               image_url: image,
               // Add other relevant details
            });

            await userDetails.updateOne({ username: username }, { tweet, image_url: image, tweet_id: tweet_id });
            console.log(`New tweet for ${username}: ${tweet}`);
         } else {
            // Tweet already exists
            console.log(`Tweet for ${username} is already saved`);
         }
      }

      // Print or use the new tweets array
      console.log("New tweets:", newTweets);

      console.log('Tweets data saved to the database and user logged in.');
   } catch (error) {
      console.error('Error in cron job:', error.message);
   }
}

// async function saveTweetsToDatabaseAndLogin() {
//    try {
//       const usernamesArray = await userDetails.find().distinct('username');

//       const result = await fetchTweetsForUsernames(usernamesArray);

//       for (const username of Object.keys(result)) {
//          const { tweet, image } = result[username];

//          await userDetails.updateOne({ username: username }, { tweet, image_url: image });
//       }



//       console.log('Tweets data saved to the database and user logged in.');
//    } catch (error) {
//       console.error('Error in cron job:', error.message);
//    }
// }

cron.schedule('*/1 * * * *', async () => {
   try {
      await saveTweetsToDatabaseAndLogin();
   } catch (error) {
      console.error('Error in cron job:', error.message);
   }
});


app.listen(port, () => {
   console.log(`Server is running at ${port}`);
});


module.exports = app;