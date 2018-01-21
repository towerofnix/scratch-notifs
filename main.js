'use strict'

// Stupid 23:34 decision: 'createFooBar' means the function returns an actual
// 'Foo Bar' object, whereas 'makeFooBar' means the function returns a function
// called 'fooBar'.

function createIntervalManager(intervalDelay) {
  const intervalFunctions = []

  const intervalID = setInterval(() => {
    for (const intervalFunction of intervalFunctions) {
      intervalFunction()
    }
  }, intervalDelay)

  return {
    stop() {
      clearInterval(intervalID)
    },

    addInterval(intervalFunction, callImmediately) {
      if (callImmediately) {
        intervalFunction()
      }

      intervalFunctions.push(intervalFunction)

      return {
        stop() {
          const index = intervalFunctions.indexOf(intervalFunction)

          if (index >= 0) {
            intervalFunctions.splice(index)
          }
        }
      }
    }
  }
}

function getUserMessageCount(username, token) {
  return fetch(`https://api.scratch.mit.edu/users/${username}/messages/count?x-token=${token}`)
    .then(res => res.json())
    .then(data => {
      if ('count' in data) {
        return data.count
      } else {
        throw data
      }
    })
}

function makeAddUser({ container, intervalManager }) {
  return function addUser(username, { onCount, onRemove }) {
    if (username.includes(';')) {
      alert('That is extremely not a valid username, please fix it.')
      return
    }

    const removeButton = document.createElement('button')
    removeButton.appendChild(document.createTextNode('Remove'))

    const logInButton = document.createElement('button')
    logInButton.appendChild(document.createTextNode('Log in'))

    const logOutButton = document.createElement('button')
    logOutButton.appendChild(document.createTextNode('Log out'))

    const label = document.createElement('b')
    label.appendChild(document.createTextNode(username + ':'))

    const countSpan = document.createElement('span')
    countSpan.appendChild(document.createTextNode('(Getting..)'))

    const parent = document.createElement('p')
    parent.appendChild(removeButton)
    parent.appendChild(document.createTextNode(' '))
    parent.appendChild(logInButton)
    parent.appendChild(document.createTextNode(' '))
    parent.appendChild(logOutButton)
    parent.appendChild(document.createTextNode(' '))
    parent.appendChild(label)
    parent.appendChild(document.createTextNode(' '))
    parent.appendChild(countSpan)

    container.appendChild(parent)

    const update = async function() {
      const tokenMatch = document.cookie.match(new RegExp(`token-${username}=([^;]*)`))

      if (tokenMatch === null) {
        logInButton.style.display = 'inline-block'
        logOutButton.style.display = 'none'
        countSpan.firstChild.replaceWith(`(Not logged in)`)
      } else {
        logInButton.style.display = 'none'
        logOutButton.style.display = 'inline-block'

        const token = tokenMatch[1]
        let count = null

        getUserMessageCount(username, token).then(
          count => {
            countSpan.firstChild.replaceWith(count)
            onCount(count)
          },
          error => {
            console.log(error)
            countSpan.firstChild.replaceWith(`(Error with code: ${error.code})`)
            interval.stop()
            console.error(error)
          }
        )
      }
    }

    const interval = intervalManager.addInterval(update, true)

    const deleteCookie = function() {
      document.cookie = `token-${username}=; path=${location.pathname}; expires=Thu, 18 Dec 2013 12:00:00 UTC`
    }

    removeButton.addEventListener('click', () => {
      interval.stop()
      container.removeChild(parent)

      if (confirm('Do you also want to delete your log-in cookie?')) {
        deleteCookie()
      }

      onRemove()
    })

    logInButton.addEventListener('click', () => {
      const token = prompt(
        'What is your login token? This can be gotten from here:\n' +
        'https://scratch.mit.edu/session'
      )

      if (token) {
        if (token.includes(';')) {
          alert(
            'Your login token isn\'t supposed to contain a semicolon..\n' +
            'Try copy-pasting it again?'
          )
          return
        }

        // Apparently assigning to document.cookie actually adds a cookie???
        // Thanks, JavaScript(tm).
        document.cookie = `token-${username}=${token}; path=${location.pathname}`
        update()
      }
    })

    logOutButton.addEventListener('click', () => {
      deleteCookie()
      update()
    })
  }
}

// ----------------------------------------------------------------------------

{
  const container = document.getElementById('container')
  const bookmark = document.getElementById('bookmark')

  const intervalManager = createIntervalManager(30 * 1000)

  const addUser = makeAddUser({container, intervalManager})

  const users = new Map()

  const updateTitle = () => {
    const totalMessageCount = Array.from(users.values())
      .reduce((a, b) => a + b)

    const usersWithNotifs = Array.from(users.entries())
      .filter(([ user, count ]) => count > 0)
      .map(([ user, count ]) => user)

    document.title = `(${totalMessageCount}) ${usersWithNotifs.join(', ')}`
  }

  const updateBookmark = () => {
    bookmark.href = '#' + Array.from(users.keys()).join(',')
  }

  const makeHandleNewCount = username => newCount => {
    users.set(username, newCount)
    updateTitle()
  }

  const makeHandleRemove = username => () => {
    users.delete(username)
    updateTitle()
    updateBookmark()
  }

  const quickAddUser = username => {
    users.set(username, 0)

    addUser(username, {
      onCount: makeHandleNewCount(username),
      onRemove: makeHandleRemove(username)
    })
  }

  document.getElementById('add-user').addEventListener('click', () => {
    const username = prompt('Username?')

    if (username) {
      quickAddUser(username)
      updateBookmark()
    }
  })

  const usersToLoadInitially = location.hash.slice(1).split(',')
    .filter(username => username.length > 0)

  for (let username of usersToLoadInitially) {
    quickAddUser(username)
  }

  updateBookmark()
}
