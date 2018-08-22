const GoogleGmail = require('../index')
const {OAuth2Client} = require('google-auth-library')
const fs = require('mz/fs')
const path = require('path')
const email = 'me'
const keysFile = path.join(__dirname, '..', 'keys', 'client_secret.json')
const tokenFile = path.join(__dirname, '..', 'keys', 'oauth_token_test')
const objKeys = require('lodash').values

;(async () => {
  const keys = JSON.parse(await fs.readFile(keysFile))
  let token = JSON.parse(await fs.readFile(tokenFile))
  const oAuth2Client = new OAuth2Client(
                            keys.installed.client_id,
                            keys.installed.client_secret)
  const gmail = new GoogleGmail({
    authClient: oAuth2Client,
    userId: email
  })
  oAuth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      token = tokens
      oAuth2Client.setCredentials(tokens)
    }
  })
  oAuth2Client.setCredentials(token)
  const label = await gmail.getLabelWithName('Testing/Mini')
  console.log('Label ID:',label.id,'for name "' + label.name + '"')
  // const labelIds = await gmail.listLabels()
  // console.log('Label Name:',labelIds)
  const messageIds = await gmail.listMessages(1,null,['Label_3'],false)
  console.log('Message IDs:',messageIds)
  const message = await gmail.getMessage(messageIds[0].id)
  console.log('Message',message)
  const attachments = await gmail.getAttachmentsFromMessage(message)
  console.log('Message Attachments',attachments[0])
  
})()
