const dsteem = require('eftg-dsteem')
const crypto = require('crypto')
const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')

const IMAGE_HOSTER = 'https://cdn.blkcc.xyz'
const RPC_NODE = 'https://api.blkcc.xyz'

// Authentication
const username = 'your username'
const password = 'your posting key'

// File to upload
const filename = '../SteemWhitePaper.pdf'

// Metadata
const issuer_name       = 'Post Telecom PSF S.A.'
const home_member_state = 'LU'
const identifier_id     = 4 //ISIN. Check IDs at https://cdn.blkcc.xyz/identifier.json
const identifier_value  = '549300HODTJUIOVE3C26'
const subclass          = 3 //Annual Financial report. Check classes and subclasses at https://cdn.blkcc.xyz/class_subclass_tree.json
const disclosure_date   = '2019-01-17T12:00:00' //format yyyy-mm-ddTHH:mm:ss
const document_language = 'en' // https://cdn.blkcc.xyz/lang.json
const title             = 'Post - Annual Financial Report 2018'
const financial_year    = '2018'
const tags              = [
                            'annual-financreport', // https://cdn.blkcc.xyz/class_subclass_tree.json
                            issuer_name,
                            home_member_state,
                            identifier_value
                          ]

// Connection with the RPC node
const client = new dsteem.Client(RPC_NODE)

// Function to publish new reports in the blockchain
async function publish(){

  try{
    // Load and sign file
    const data = fs.readFileSync(filename)

    const privKey = dsteem.PrivateKey.fromString(password)
    const imageHash = crypto.createHash('sha256')
      .update('ImageSigningChallenge')
      .update(data)
      .digest()
    const signature = privKey.sign(imageHash).toString()
    const urlWithSignature = `${ IMAGE_HOSTER }/${ username }/${ signature }`
    
    // Upload file
    let form = new FormData()
    form.append('file', fs.createReadStream(filename))
    
    var response = await axios({
         method: 'post',
         url: urlWithSignature,
         data: form,
         headers: form.getHeaders()
       })
           
    const pdfUrl = response.data.url;
    
    // Definition of content
    const body = '[[pdf link]](' + pdfUrl + ')'

    const json_metadata = {
      issuer_name,
      home_member_state,
      identifier_id,
      identifier_value,
      subclass,
      disclosure_date,
      document_language,
      comment: title,
      financial_year,
      tags,
      submission_date: new Date().toISOString().slice(0, -5),
      app: 'sendjs/0.0.1'
    }

    // Definition of the link to the post
    let permlink = title.toLowerCase().replace(/\s+/g, "-").replace(/[^0-9a-z-]/gi, "")
    // optional: add random string to permlink
    permlink = Math.random().toString(36).substring(7) + '-' + permlink

    const post = {
      author: username,
      body: body,
      json_metadata: JSON.stringify(json_metadata),
      parent_author: '',
      parent_permlink: 'oam',
      permlink: permlink,
      title: title
    }

    // Broadcast to the blockchain
    const responsePost = await client.broadcast.comment(post, privKey);
    console.log('New report published!!')
    console.log(`permlink: @${username}/${permlink}`)
    console.log(`link pdf: ${pdfUrl}`)
  }catch(error){
    console.log(error)
  }
}

publish()
