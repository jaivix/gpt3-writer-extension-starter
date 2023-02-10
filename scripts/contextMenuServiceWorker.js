const sendMessage = (content) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0].id;

        chrome.tabs.sendMessage(
            activeTab,
            { message: 'inject', content },
            (response) => {
                if (response.status === 'failed') {
                    console.log('injection failed.');
                }
            }
        );
    });
};

// Function to get + decode API key
const getKey = () => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['openai-key'], (result) => {
            if (result['openai-key']) {
                const decodedKey = atob(result['openai-key']);
                resolve(decodedKey);
            }
        });
    });
};

const generate = async (prompt) => {
    // Get your API key from storage
    const key = await getKey();
    const url = 'https://api.openai.com/v1/completions';
    console.log("Prompt: ", prompt);
    // Call completions endpoint
    const completionResponse = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
            model: 'text-davinci-003',
            prompt: prompt,
            max_tokens: 1250,
            temperature: 0.7,
        }),
    });

    // Select the top choice and send back
    const completion = await completionResponse.json();
    console.log(completion);
    return completion.choices.pop();
}

const generateCompletionAction = async (info) => {
    try {
        // Send mesage with generating text (this will be like a loading indicator)
        sendMessage('generating...');
        
        const { selectionText } = info;
        const basePromptPrefix = `
          Write me a detailed steps for creating a startup with below title.
                
          Title: `;

        const baseCompletion = await generate(
            `${basePromptPrefix}${selectionText}`
        );

        // Add your second prompt here
        // const secondPrompt = `
        //   Take the table of contents and title startup idea below and generate a blog post written in the style of Steve Jobs. Make it feel like a story. Don't just list the points. Go deep into each one. Explain why.

        //   Title: ${selectionText}

        //   Table of Contents: ${baseCompletion.text}

        //   Detailed Analysis: `;

        // // Call your second prompt
        // const secondPromptCompletion = await generate(secondPrompt);
        sendMessage(baseCompletion.text);
        // console.log(secondPromptCompletion);
    } catch (error) {
        console.log(error);
        sendMessage(error.toString());
    }
};

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'context-run',
        title: 'Analyze startup idea',
        contexts: ['selection'],
    });
});

// Add listener
chrome.contextMenus.onClicked.addListener(generateCompletionAction);