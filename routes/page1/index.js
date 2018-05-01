'use strict'

module.exports = {
    method: 'get',
    path: '/',
    handler: async (req, h) => {

        try{
            const page = require('~/templates/user.marko')
            return page.stream({
                title: "Marko!!"
        })

        } catch (err) {
            console.error(err.message)
            return err.message
        }
    }
}