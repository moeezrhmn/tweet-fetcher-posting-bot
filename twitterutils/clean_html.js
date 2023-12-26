const jsdom = require('jsdom');
const { JSDOM } = jsdom;

function cleanHtml(contentHtml) {
    const dom = new JSDOM(contentHtml);
    const document = dom.window.document;

    // Remove img tags
    const imgElements = document.querySelectorAll('img');
    imgElements.forEach((img) => img.remove());

    // Remove all other tags
    const cleanContent = document.body.textContent.trim();

    return cleanContent;
}

function cleanItem(item) {
    if (!item || !item.content_html) {
        console.error("The 'content_html' is missing in the provided item.");
        return null;
    }

    const cleanedContent = cleanHtml(item.content_html);

    return {
        ...item,
        content_html: cleanedContent,
    };
}



module.exports = { cleanItem }


