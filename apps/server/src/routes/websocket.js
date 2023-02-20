const router = async (app, _opt) => {
  await app.get('/', { websocket: true }, (connection, _req) => {
    console.log('get ws')
    connection.socket.on('message', _message => {
      console.log('connection.socket.on')
      connection.socket.send('hi from server')
    })
  })
}

export default router
