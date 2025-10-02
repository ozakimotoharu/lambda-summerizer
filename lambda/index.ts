import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export const handler = async (event) => {
  const inputText = event.message;
  const prompt = `以下の文章を簡潔に要約してください:\n\n${inputText}`;

  const client = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION });

  const command = new InvokeModelCommand({
    modelId: process.env.MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      prompt: prompt,
      max_tokens_to_sample: 300,
      temperature: 0.5,
    }),
  });

  const response = await client.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));

  return {
    summary: result.completion,
  };
};