// Quick test script to check API response
async function testActiveSessionAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/customer/sessions/active', {
      headers: {
        'Cookie': process.env.COOKIE || ''
      }
    })
    const data = await response.json()
    console.log('Response status:', response.status)
    console.log('Response data:', JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error:', error.message)
  }
}

testActiveSessionAPI()
