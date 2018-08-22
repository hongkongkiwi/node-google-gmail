'use strict'

const {
  isArray,
  isNumber,
  isString,
  assign,
  find,
  concat,
  slice,
  has,
  each
} = require('lodash')
const gmailVersion = 'v1'
let google
let gmail

class GoogleGmail {
  constructor(newOpts) {
    let opts = {
      Promise: Promise,
      userId: "me",
      authClient: null
    }
    assign(this, opts, newOpts)

    if (!this.authClient) {
      return new Error("No Auth Client passed")
    }

    google = require('googleapis').google
    gmail = gmail || google.gmail({ auth: this.authClient, version: gmailVersion });

    // var RateLimiter = require('limiter').RateLimiter
    // if (!isNull(this.RateLimiter) && !isUndefined(this.RateLimiter)) {
    //   this.limiter = new RateLimiter(1, 250)
    // }
    // var limiter = new RateLimiter(1, 250)
    // var requestsToday = 0 // Gets reset on each "new" day
    // var requestsLimitPerDay = 200
  }

  // async loadCredentials(credentialsFile) {
  //   let credentials
  //   if (isString(credentialsFile)) {
  //     credentials = JSON.parse(await readFileAsync(credentialsFile, 'utf8'))
  //   }
  //   if (isEmpty(credentials) || !isObject(credentials)) {
  //     return Promise.reject("No credentials passed")
  //   }
  //   this.credentials = credentials
  //   this.authClient = new google.auth.JWT(
  //     this.credentials.client_email,
  //     null,
  //     this.credentials.private_key,
  //     this.authScopes
  //   )
  //   return Promise.resolve()
  // }

  /**
   * Lists the labels in the user's account.
   */
  async listLabels() {
    const params = {
      auth: this.authClient,
      userId: this.userId
    }
    const response = await gmail.users.labels.list(params)
    return response.data.labels
  }

  /**
   * Get the information for a label
   */
  async getLabel(labelId) {
    const params = {
      auth: this.authClient,
      userId: this.userId,
      id: labelId
    }
    const response = await gmail.users.labels.get(params)
    return response.data.labels
  }

  /**
   * Get the label id from a name
   */
  async getLabelWithName(labelName) {
    const labels = await this.listLabels()
    return find(labels, {name: labelName}) || null
  }

  /**
   * Get Attachments from a given Message.
   *
   * @param  {String} message Message Content.
   */
  async getAttachmentsFromMessage(message) {
    let attachments = []
    for (let part of message.payload.parts) {
      //console.log(part)
      if (part.filename && part.filename.length > 0) {
        let attachment = await this.getAttachment(part.body.attachmentId, message.id)
        attachment.filename = part.filename
        attachment.mimeType = part.mimeType
        attachments.push(attachment)
      }
    }
    return attachments
  }

  /**
   * Get Attachments from a given Message.
   *
   * @param  {String} message Message Content.
   */
   async getAttachmentsFromMessageId(messageId) {
     const message = await this.getMessage(messageId)
     return this.getAttachmentsFromMessage(message)
   }

  async getAttachment(attachmentId, messageId) {
    const params = {
      auth: this.authClient,
      userId: this.userId,
      id: attachmentId,
      messageId: messageId
    }
    const response = await gmail.users.messages.attachments.get(params)
    let attachment = response.data
    attachment.data = Buffer.from(attachment.data, 'base64')
    attachment.id = attachmentId
    return attachment
  }

  /**
   * Get Message with given ID.
   *
   * @param  {String} messageId ID of Message to get.
   * @param  {Function} callback Function to call when the request is complete.
   */
  async getMessage(messageId) {
    const params = {
      auth: this.authClient,
      userId: this.userId,
      id: messageId
    }
    const response = await gmail.users.messages.get(params)
    return response.data
  }

  /**
   * Trash the specified message.
   */
  async trashMessage(messageId) {
    const params = {
      auth: this.authClient,
      userId: this.userId,
      id: messageId
    }
    return await gmail.users.messages.trash(params)
  }

  /**
   * Retrieve Messages in user's mailbox matching query.
   */
  async listMessages(maxResults, query, labelIds, includeSpamTrash, pageSize) {
    let params = {
      auth: this.authClient,
      userId: this.userId,
      includeSpamTrash: includeSpamTrash || false,
    }
    if (labelIds && isArray(labelIds)) params.labelIds = labelIds
    if (pageSize && isNumber(pageSize) && pageSize > 0) params.maxResults = pageSize
    maxResults = (maxResults && isNumber(maxResults) && maxResults > 0) ? maxResults : -1
    if (query && isString(query) && query.length > 0) params.query = query
    let messageIds = []
    // Keep getting messages as long as we have a pageToken
    while (true) {
      const response = await gmail.users.messages.list(params)
      const data = response.data
      messageIds = concat(messageIds, data.messages)
      if (has(data, 'nextPageToken')) {
        params.pageToken = data.nextPageToken
      }
      if (!params.pageToken) break
      if (maxResults > 0 && messageIds.length >= maxResults) break
    }
    if (maxResults > 0 && messageIds.length > maxResults) {
      messageIds = slice(messageIds, 0, maxResults)
    }
    return messageIds
  }
}

module.exports = GoogleGmail
