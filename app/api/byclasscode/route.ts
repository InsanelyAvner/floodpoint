import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const classCode = searchParams.get('classcode')
  
  const response = await fetch(`https://apitwo.classpoint.app/classcode/region/byclasscode?classcode=${classCode}`, {
    headers: {
      'accept': 'application/json',
    },
  })

  const data = await response.json()
  return NextResponse.json(data)
}