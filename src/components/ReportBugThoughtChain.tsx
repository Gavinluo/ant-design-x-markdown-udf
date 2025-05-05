import React, { useState, ReactElement } from "react";
import { Bubble, Sender, ThoughtChain, useXAgent, useXChat } from "@ant-design/x";
import type { ThoughtChainItem } from "@ant-design/x";
import { CheckCircleOutlined, InfoCircleOutlined, LoadingOutlined, MoreOutlined } from "@ant-design/icons";
import { Card, Button, Space } from "antd";
import '@ant-design/v5-patch-for-react-19';
import { BubbleDataType } from "@ant-design/x/es/bubble/BubbleList";

const ReportBugThoughtChain = () => {
    const [expandedKeys, setExpandedKeys] = useState<string[]>(['think']);
    const [inputValue, setInputValue] = useState('');
    let currentContentRef = '';
    let currentItemIndex = 0;

    const [chainItems, setChainItems] = useState<ThoughtChainItem[]>([{
    key: 'think',
    title: "思考",
    description: '思考中...',
    extra: <Button type="text" icon={<MoreOutlined />} />,
    status: "pending" as const,
    icon: <LoadingOutlined/>,
    content: '思考中...'
    }]);
// ==================== Runtime ====================
    const [agent] = useXAgent<BubbleDataType>({
    baseURL: 'http://localhost:5002/v1/chat/completions',
    model: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
    dangerouslyApiKey: 'Bearer sk-ravoadhrquyrkvaqsgyeufqdgphwxfheifujmaoscudjgldr',
    });
  const { messages, onRequest, setMessages } = useXChat({
    agent,
    requestFallback: (_, { error }) => {
      if (error.name === 'AbortError') {
        return {
          content: 'Request is aborted',
          role: 'assistant',
        };
      }
      return {
        content: 'Request failed, please try again!',
        role: 'assistant',
      };
    },
    transformMessage: (info) => {
      const { originMessage, chunk } = info || {};
      let currentText = '';
      if(chunk?.data.includes("</think>")){
        //思考完成，创建调用工具节点
        currentItemIndex++;
        setChainItems(prev => {
          const newItems = [...prev];
          newItems.push({
            key: `${currentItemIndex}`,
            title: "请求调用工具",
            description: "",
            icon: <LoadingOutlined />,
            extra: <Button type="text" icon={<MoreOutlined />} />,
            status: "pending",
            content: ""
          })
          newItems[0].status= "success";
          newItems[0].description= `思考完成`;
          newItems[0].icon= <CheckCircleOutlined />;
          newItems[0].content= currentContentRef;
          currentContentRef = '';
          // 在这里打印新的状态
            console.log(newItems);
          return newItems;
        });
      }
      try {
        if (chunk?.data && !chunk?.data.includes('DONE')) {
          const message = JSON.parse(chunk?.data);
          currentText = message?.choices?.[0].delta?.content;
          currentContentRef += currentText;
          if (currentItemIndex===0){
          setChainItems(prev => {
            const newItems = [...prev];
            newItems[0].content = currentContentRef;
            return newItems;
          });
        }
        } 
      } catch (error) {
        console.error(error);
      }
      
      return {
        content: <ThoughtChain 
          items={chainItems} 
          collapsible={{
            expandedKeys,
            onExpand: setExpandedKeys
          }}
        />,
        role: 'assistant',
      };
    },
  });
  const handleUserSubmit = (val: string) => {
    onRequest({
      stream: true,
      message: { content: val, role: 'user' },
    });
  };

  return (
    <Card style={{ width: 500 }}>
      <Bubble.List
            style={{ height: '100%', paddingInline: 16 }}
            items={messages?.map((i) => ({
              ...i.message
            }))}
            roles={{
              assistant: {
                placement: 'start',
              },
              user: { placement: 'end' },
            }}
          />
      <Sender
        value={inputValue}
        onChange={(v) => {
        setInputValue(v);
        }}
       onSubmit={() => {
                handleUserSubmit(inputValue);
                setInputValue('');
              }}></Sender>
    </Card>
  );
};

export default ReportBugThoughtChain;
