import quotedPrintable from 'quoted-printable'
import utf8 from 'utf8'

let fakeMails = []

const mhApiUrl = path => {
  const basePath = Cypress.config('mailHogUrl')
  return `${basePath}/api${path}`
}

export const decodePrintable = encodedString => utf8.decode(quotedPrintable.decode(encodedString))

Cypress.Commands.add('deleteAllMails', () => {
  fakeMails = []
  return cy.request('DELETE', mhApiUrl('/v1/messages'))
})

Cypress.Commands.add('getLastMail', (infos) => {
  cy.request({
    method: 'GET',
    url: mhApiUrl('/v2/messages?limit=10'),
  })
    .then(response => JSON.parse(JSON.stringify(response.body)))
    .then(parsed => parsed.items)
    .then(mails => mails.concat(fakeMails))
    .then(mails => infos && infos.recipient
      ? mails.filter(mail =>
        mail.To.map(
          recipientObj => `${recipientObj.Mailbox}@${recipientObj.Domain}`,
        ).includes(infos.recipient),
      )
      : mails,
    )
    .then(mails => infos && infos.subjectContains
      ? mails.filter(mail => new RegExp(infos.subjectContains).test(mail.Content.Headers.Subject[0]))
      : mails,
    )
    .then(mails => infos && infos.subject
      ? mails.filter(mail => mail.Content.Headers.Subject[0] === infos.subject)
      : mails,
    )
    .then(mails => {
      return Array.isArray(mails) && mails.length > 0 ? mails[0] : mails
    })
})

Cypress.Commands.add('getSubject', { prevSubject: true }, (mail) => {
  return cy.wrap(mail.Content.Headers).then((headers) => decodePrintable(headers.Subject[0]))
})

Cypress.Commands.add('getBody', { prevSubject: true }, (mail) => {
  return cy.wrap(mail.Content).its('Body').then(body => {
    return decodePrintable(body)
  })
})

Cypress.Commands.add('getValidationLink', { prevSubject: true }, (mail) => {
  // const mailBody = mail.Content.Body
  return cy.wrap(mail.Content).its('Body').then(mailBody => {
    const boundary = mailBody.substr(0, mailBody.indexOf('\n'))
    const parts = mailBody.split(boundary)
    const htmlPart = parts[1]
    const encodedValidationLink = htmlPart.substring(htmlPart.indexOf('<a href='), htmlPart.indexOf('</a>') + 4)

    const validationLink = decodePrintable(encodedValidationLink)
    const link = validationLink.replace(/<a href="(https?:\/\/(?:[-a-z0-9]+)(?::\d+)?(\/[^"]+))" rel="notrack">.*/, '$1')
    return link
  })
})

Cypress.Commands.add('getResetLink', { prevSubject: true }, (mail) => {
  // const mailBody = mail.Content.Body
  return cy.wrap(mail.Content).its('Body').then(mailBody => {
    const boundary = mailBody.substr(0, mailBody.indexOf('\n'))
    const parts = mailBody.split(boundary)
    const htmlPart = parts[1]
    const encodedResetLink = htmlPart.substring(htmlPart.indexOf('<a href='), htmlPart.indexOf('</a>') + 4)

    const resetLink = decodePrintable(encodedResetLink)
    const link = resetLink.replace(/<a href="(https?:\/\/(?:[-a-z0-9]+)(?::\d+)?(\/[^"]+))" rel="notrack">.*/, '$1')
    return link
  })
})

Cypress.Commands.add('getRecipients', { prevSubject: true }, (mail) => {
  return cy
    .wrap(mail)
    .then((mail) => {
      return (mail.To || []).map(
        (recipientObj) => `${recipientObj.Mailbox}@${recipientObj.Domain}`,
      )
    })
})
