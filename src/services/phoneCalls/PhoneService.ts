require('dotenv').config();
const telnyx = require('telnyx')(process.env.TELNYX_API_KEY);
import fetch from 'node-fetch';


class PhoneService {

    constructor() {

        // this.makeCall();
    }

    async numberSearch(city:string, state:string) {
        const { data: numbersList } = await telnyx.availablePhoneNumbers.list({
            filter: {"locality": city, "administrative_area": state, "limit": 2}
        });

        return numbersList
    }


    async PurchaseNumber(phoneNumber:string) {
        const { data: numberOrder } = await telnyx.numberOrders.create({
            phone_numbers:[{"phone_number": phoneNumber}]
          });
  

        return numberOrder
    }

    async makeCall() {
        
        try {
            const applicationId = '2290981786043286781';
            const resp = await fetch(
                `https://api.telnyx.com/v2/texml/calls/${process.env.TELNYX_APP_ID}`,
                {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.TELNYX_API_KEY}`
                },
                body: JSON.stringify({
                    To: '+18186670307',
                    From: '+12139461362',
                    StatusCallbackEvent:'answered',
                    StatusCallback: process.env.WEBHOOK_URL,
                    transcription:true
                })
                }
            );

            const data = await resp.json();

            } catch (error) {
                console.error(error);
            }
        }
    }


export default PhoneService