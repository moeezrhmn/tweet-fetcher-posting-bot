const fs = require("node:fs").promises;
const path = require("path");

async function readDirectory(directory) {
  try {
    await fs.access(directory);
    const files = await fs.readdir(directory);

    const allFiles = await Promise.all(
      files.map(async (fileName) => {
        const filePath = path.join(directory, fileName);
        const stats = await fs.lstat(filePath);
        return stats.isFile() ? filePath : null;
      })
    );
    const filePaths = allFiles.filter((filePath) => filePath !== null);
    return filePaths;
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(`Directory "${directory}" does not exist.`);
      return [];
    } else {
      throw error;
    }
  }
}

async function getRandImage() {
  let imagesDir = "../tweetImage";
  imagesDir = path.join(__dirname, imagesDir);

  let images = await readDirectory(imagesDir);
  const randomIndex = Math.floor(Math.random() * images.length);
  const randomImage = images[randomIndex];
  return randomImage;
}



async function downloadImage(url, destDir, defaultExtension = ".jpg") {
  const response = await axios({
    method: "GET",
    url: url,
    responseType: "stream",
  });

  const fileName = `image_${Date.now()}${defaultExtension}`;
  const destPath = path.join(destDir, fileName);

  const writer = fs.createWriteStream(destPath);

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    let error = null;
    writer.on("error", (err) => {
      error = err;
      writer.close();
      reject(err);
    });
    writer.on("close", () => {
      if (!error) {
        resolve(destPath);
      }
    });
  });
}

async function fetchTweets(username) {
  try {
    let tweet_data = await fetch_tweet(username);

    return {
      tweet: tweet_data.timeline[0].text,
      image:
        "https://images.unsplash.com/photo-1575936123452-b67c3203c357?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aW1hZ2V8ZW58MHx8MHx8fDA%3D",
      tweet_id: tweet_data.timeline[0].tweet_id,
    };
  } catch (error) {
    console.error(`Error fetching tweets for ${username}:`, error.message);
    return {
      error: true,
      message: `Error fetching tweets for ${username}: ${error.message}`,
    };
  }
}

module.exports = {
  getRandImage,
  downloadImage,
  fetchTweets,
};
