import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

interface LambdaEvent {
  message: string;
}

const decoder = new TextDecoder();

export const handler = async (event: LambdaEvent) => {
  const originalText = event.message;

  // AWS Translate
  const translate = new TranslateClient({});
  const translateResult = await translate.send(new TranslateTextCommand({
    SourceLanguageCode: "en",
    TargetLanguageCode: "ja",
    Text: originalText
  }));

  // Claude 3.0 Sonnet via Bedrock
  const bedrock = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION });

  const bedrock30Result = await bedrock.send(new InvokeModelCommand({
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      messages: [
        {
          role: "user",
          content: `以下要約してください\n\n"${originalText}"`
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    })
  }));

  //const decoded = decoder.decode(bedrock3Result.body);
  //const claudeResponse = JSON.parse(decoder.decode(bedrock3Result.body));
  const claude30Text = JSON.parse(decoder.decode(bedrock30Result.body)).content[0].text;

  console.log("🔍 原文:", originalText);
  console.log("🟦 AWS Translate:", translateResult.TranslatedText);
  console.log("🟨 Claude 3.0 Sonnet:", claude30Text);

  return {
    original: originalText,
    translate: translateResult.TranslatedText,
    claude: claude30Text
  };
};

// エスケープ解除関数はそのままでOK
function unescapeText(input: string) {
  let result = input
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");

  result = result.replace(/\\u([dD][89a-fA-F][0-9a-fA-F]{2})\\u([dD][c-fC-F][0-9a-fA-F]{2})/g, (_, high, low) => {
    const hi = parseInt(high, 16);
    const lo = parseInt(low, 16);
    const codePoint = ((hi - 0xD800) << 10) + (lo - 0xDC00) + 0x10000;
    return String.fromCodePoint(codePoint);
  });

  result = result.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  return result;
}