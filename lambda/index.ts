import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";


type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

interface LambdaEvent {
  message: string;
}

const decoder = new TextDecoder();

export const handler = async (event: LambdaEvent) => {


  const inputText = event.message;
  const region = process.env.BEDROCK_REGION ?? "us-east-1";
  const modelId = process.env.MODEL_ID ?? "anthropic.claude-3-sonnet-20240229-v1:0";
  //const modelId = "anthropic.claude-3-haiku-20240307-v1:0";

  const sts = new STSClient({ region: region });
  const identity = await sts.send(new GetCallerIdentityCommand({}));
  console.log("Caller Identity:", identity);
  console.log("modelId:", modelId)

  const client = new BedrockRuntimeClient({ region });

  const messages: ChatMessage[] = [
    { role: "user", content: inputText }
  ];

  console.log("messages:", messages)

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      messages,
      max_tokens: 1000,
      temperature: 0.5
    })
  });

  try {
    const response = await client.send(command);
    const result = JSON.parse(decoder.decode(response.body));
    console.log("Bedrock response:", JSON.stringify(result,null,'  '),"\n--\n",unescapeText(result.content[0].text));
    return { summary: unescapeText(result.content[0].text) };
  } catch (error) {
    console.error("Bedrock invocation failed:", error);
    throw new Error(`要約処理に失敗しました(modelId:${modelId})`);
  }
};



/**
 * エスケープされた文字列を整形し、改行・Unicode・サロゲートペアも反映する
 * @param {string} input - エスケープされた文字列
 * @returns {string} - 整形された文字列
 */
function unescapeText(input:string) {
  // 基本エスケープ処理
  let result = input
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");

  // サロゲートペア対応（例: \uD83D\uDE80 → 🚀）
  result = result.replace(/\\u([dD][89a-fA-F][0-9a-fA-F]{2})\\u([dD][c-fC-F][0-9a-fA-F]{2})/g, (_, high, low) => {
    const hi = parseInt(high, 16);
    const lo = parseInt(low, 16);
    const codePoint = ((hi - 0xD800) << 10) + (lo - 0xDC00) + 0x10000;
    return String.fromCodePoint(codePoint);
  });

  // 通常のUnicode（例: \u3042 → あ）
  result = result.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  return result;
}