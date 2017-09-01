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

function getUserMessageCount(username) {
  return fetch(`https://api.scratch.mit.edu/users/${username}/messages/count`)
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
    const removeButton = document.createElement('button')
    removeButton.appendChild(document.createTextNode('Remove'))

    const label = document.createElement('b')
    label.appendChild(document.createTextNode(username + ':'))

    const countSpan = document.createElement('span')
    countSpan.appendChild(document.createTextNode('(Getting..)'))

    const parent = document.createElement('p')
    parent.appendChild(removeButton)
    parent.appendChild(document.createTextNode(' '))
    parent.appendChild(label)
    parent.appendChild(document.createTextNode(' '))
    parent.appendChild(countSpan)

    container.appendChild(parent)

    const interval = intervalManager.addInterval(() => {
      getUserMessageCount(username)
        .then(count => {
          countSpan.firstChild.replaceWith(count)
          onCount(count)
        })
        .catch(error => {
          countSpan.firstChild.replaceWith(`(Error with code: ${error.code})`)
          interval.stop()
          console.error(error)
        })
    }, true)

    removeButton.addEventListener('click', () => {
      interval.stop()
      container.removeChild(parent)
      onRemove()
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
    console.log(Array.from(users.keys()))
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
