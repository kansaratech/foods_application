import React from 'react'
import Paragraph from '../Para'
import Heading from '../Heading'
import ListItem from '../ListItem'


  interface OneParaProps {
    number: string;
    head: string;
    paras: string[];
  }
  
const OnePara = ({Para}) => {
  return (
    <div className='my-14'>
        <div className='flex gap-3 items-center font-bold'>
        <h3>{Para.number}</h3>
        <Heading heading={Para.head}/>
        </div>
        {Para?.paras?.map((paragraph: string, index: number)=>
        {
           return <Paragraph
           key={index}
           paragraph={paragraph} />

        })}
        <ul className='list-disc list-inside mx-4'>
        {
            Para?.list?.map((item:OneParaProps, index: number)=>
            {
             return <ListItem
             key={index}
             item={item}  />
            })
        }
        </ul>
      
    </div>
  )
}

export default OnePara
