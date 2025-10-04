# LambdaとBedrockの設定
$LambdaRegion = "ap-northeast-1"
$BedrockRegion = "us-east-1"
$ModelId = "anthropic.claude-3-sonnet-20240229-v1:0"
$FunctionName = "bedrockSummerizer"

Write-Host "`n🔍 Step 1: Claude 3 Sonnet モデルが Bedrock ($BedrockRegion) に存在するか確認"

$models = aws bedrock list-foundation-models --region $BedrockRegion | ConvertFrom-Json
$hasClaude = $models.modelSummaries | Where-Object { $_.modelId -eq $ModelId }

if ($hasClaude) {
    Write-Host "✅ Claude 3 Sonnet モデルは Bedrock ($BedrockRegion) に存在します"
} else {
    Write-Host "❌ Claude 3 Sonnet モデルが Bedrock ($BedrockRegion) に見つかりません"
}

Write-Host "`n🔍 Step 2: Lambda ($LambdaRegion) の IAM ロールを取得"

$lambdaInfo = aws lambda get-function --function-name $FunctionName --region $LambdaRegion | ConvertFrom-Json
$roleArn = $lambdaInfo.Configuration.Role

if ($roleArn) {
    Write-Host "✅ Lambda に割り当てられている IAM ロール: $roleArn"

    Write-Host "`n🔍 Step 3: IAM ロールが Claude 3 Sonnet モデルへの bedrock:InvokeModel を許可しているか確認"

    $policyCheck = aws iam simulate-principal-policy `
        --policy-source-arn $roleArn `
        --action-names "bedrock:InvokeModel" `
        --resource-arns "arn:aws:bedrock:$BedrockRegion::foundation-model/$ModelId" `
        --region $BedrockRegion | ConvertFrom-Json

    $decision = $policyCheck.evaluationResults[0].evalDecision
    if ($decision -eq "allowed") {
        Write-Host "✅ IAM ロールは Claude 3 Sonnet モデルへの呼び出しを許可しています"
    } else {
        Write-Host "❌ IAM ロールは Claude 3 Sonnet モデルへの呼び出しを許可していません"
    }
} else {
    Write-Host "❌ Lambda の IAM ロールが取得できませんでした"
}

Write-Host "`n🔍 Step 4: Lambda の環境変数 BEDROCK_REGION が $BedrockRegion になっているか確認"

$envs = $lambdaInfo.Configuration.Environment.Variables
if ($envs.BEDROCK_REGION -eq $BedrockRegion) {
    Write-Host "✅ Lambda の環境変数 BEDROCK_REGION は正しく $BedrockRegion に設定されています"
} else {
    Write-Host "❌ Lambda の環境変数 BEDROCK_REGION が $BedrockRegion に設定されていません（現在: $($envs.BEDROCK_REGION)）"
}