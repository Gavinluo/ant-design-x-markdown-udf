/**
 * @license MIT
 * Copyright (c) 2024
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {
    AppstoreAddOutlined,
    CheckCircleOutlined,
    CloseOutlined,
    CloudUploadOutlined,
    CoffeeOutlined,
    CommentOutlined,
    CopyOutlined,
    DislikeOutlined,
    FireOutlined,
    InfoCircleOutlined,
    LikeOutlined,
    LoadingOutlined,
    MoreOutlined,
    OpenAIFilled,
    PaperClipOutlined,
    PlusOutlined,
    ProductOutlined,
    ReloadOutlined,
    ScheduleOutlined,
    SmileOutlined,
  } from '@ant-design/icons';
  import {
    Attachments,
    type AttachmentsProps,
    Bubble,
    Conversations,
    Prompts,
    PromptsProps,
    Sender,
    Suggestion,
    ThoughtChain,
    ThoughtChainItem,
    ThoughtChainProps,
    Welcome,
    XRequest,
    useXAgent,
    useXChat,
  } from '@ant-design/x';
  import type { BubbleDataType } from '@ant-design/x/es/bubble/BubbleList';
  import type { Conversation } from '@ant-design/x/es/conversations';
  import { Button, GetProp, GetRef, Image, Popover, Space, Spin, message } from 'antd';
  import { createStyles } from 'antd-style';
import { log } from 'console';
  import dayjs from 'dayjs';
  import React, { ReactElement, useEffect, useRef, useState } from 'react';
  
  const MOCK_SESSION_LIST = [
    {
      key: '5',
      label: 'New session',
      group: 'Today',
    },
    {
      key: '4',
      label: 'What has Ant Design X upgraded?',
      group: 'Today',
    },
    {
      key: '3',
      label: 'New AGI Hybrid Interface',
      group: 'Today',
    },
    {
      key: '2',
      label: 'How to quickly install and import components?',
      group: 'Yesterday',
    },
    {
      key: '1',
      label: 'What is Ant Design X?',
      group: 'Yesterday',
    },
  ];
  const MOCK_SUGGESTIONS = [
    { label: 'Write a report', value: 'report' },
    { label: 'Draw a picture', value: 'draw' },
    {
      label: 'Check some knowledge',
      value: 'knowledge',
      icon: <OpenAIFilled />,
      children: [
        { label: 'About React', value: 'react' },
        { label: 'About Ant Design', value: 'antd' },
      ],
    },
  ];
  const MOCK_QUESTIONS = [
    'What has Ant Design X upgraded?',
    'What components are in Ant Design X?',
    'How to quickly install and import components?',
  ];
  const AGENT_PLACEHOLDER = 'Generating content, please wait...';
  
  const useCopilotStyle = createStyles(({ token, css }) => {
    return {
      copilotChat: css`
        display: flex;
        flex-direction: column;
        background: ${token.colorBgContainer};
        color: ${token.colorText};
      `,
      // chatHeader 样式
      chatHeader: css`
        height: 52px;
        box-sizing: border-box;
        border-bottom: 1px solid ${token.colorBorder};
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px 0 16px;
      `,
      headerTitle: css`
        font-weight: 600;
        font-size: 15px;
      `,
      headerButton: css`
        font-size: 18px;
      `,
      conversations: css`
        width: 300px;
        .ant-conversations-list {
          padding-inline-start: 0;
        }
      `,
      // chatList 样式
      chatList: css`
        overflow: auto;
        padding-block: 16px;
        flex: 1;
      `,
      chatWelcome: css`
        margin-inline: 16px;
        padding: 12px 16px;
        border-radius: 2px 12px 12px 12px;
        background: ${token.colorBgTextHover};
        margin-bottom: 16px;
      `,
      loadingMessage: css`
        background-image: linear-gradient(90deg, #ff6b23 0%, #af3cb8 31%, #53b6ff 89%);
        background-size: 100% 2px;
        background-repeat: no-repeat;
        background-position: bottom;
      `,
      // chatSend 样式
      chatSend: css`
        padding: 12px;
      `,
      sendAction: css`
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        gap: 8px;
      `,
      speechButton: css`
        font-size: 18px;
        color: ${token.colorText} !important;
      `,
    };
  });
  
  interface CopilotProps {
    copilotOpen: boolean;
    setCopilotOpen: (open: boolean) => void;
  }
  
  const getStatusIcon = (status: ThoughtChainItem['status']) => {
    const iconMap: Record<NonNullable<ThoughtChainItem['status']>, ReactElement> = {
      success: <CheckCircleOutlined />,
      error: <InfoCircleOutlined />,
      pending: <LoadingOutlined />,
    };
    return status ? iconMap[status] : undefined;
  };
  
  const ActionButtons = ({ onConfirm, onReject, disabled = false }: { 
    onConfirm: () => void; 
    onReject: () => void;
    disabled?: boolean;
  }) => (
    <Space direction="horizontal" style={{ width: "100%" }}>
      <Button onClick={onConfirm} type="primary" disabled={disabled}>确认</Button>
      <Button onClick={onReject} danger disabled={disabled}>拒绝</Button>
    </Space>
  );
  
  const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
  
  const Copilot = (props: CopilotProps) => {
    const { copilotOpen, setCopilotOpen } = props;
    const { styles } = useCopilotStyle();
    const attachmentsRef = useRef<GetRef<typeof Attachments>>(null);
    const abortController = useRef<AbortController>(null);
  
    // ==================== State ====================
  
    const [messageHistory, setMessageHistory] = useState<Record<string, any>>({});
  
    const [sessionList, setSessionList] = useState<Conversation[]>(MOCK_SESSION_LIST);
    const [curSession, setCurSession] = useState(sessionList[0].key);
  
    const [attachmentsOpen, setAttachmentsOpen] = useState(false);
    const [files, setFiles] = useState<GetProp<AttachmentsProps, 'items'>>([]);
  
    const [inputValue, setInputValue] = useState('');
  
    const [chainItems, setChainItems] = useState<ThoughtChainItem[]>([{
      key: 'think',
      title: "思考",
      description: '思考中...',
      extra: <Button type="text" icon={<MoreOutlined />} />,
      status: "pending" as const,
      icon: <LoadingOutlined/>,
      content: '思考中...'
    }]);
    const [expandedKeys, setExpandedKeys] = useState<string[]>(['think']);
    let currentContentRef = '';
    let startDate = Date.now();
    let currentItemIndex = 0;
    // ==================== Runtime ====================
    const [agent] = useXAgent<BubbleDataType>({
      baseURL: 'http://localhost:5002/v1/chat/completions',
      model: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
      dangerouslyApiKey: 'Bearer sk-ravoadhrquyrkvaqsgyeufqdgphwxfheifujmaoscudjgldr',
    });
    const loading = agent.isRequesting();
    
    const updateChainItem = async (itemKey: number,status: ThoughtChainItem['status']) => {
      const updateItem = (content: string) => ({
        ...chainItems[itemKey],
        content,
        status,
        icon: getStatusIcon(status),
      });
  
      if (status === "success") {
        setChainItems(prev => {
          const newItems = [...prev];
          newItems[itemKey] = updateItem("正在执行");
          return newItems;
        });
        
        
        await delay(1000);
        setChainItems(prev => {
          const newItems = [...prev];
          newItems[itemKey] = updateItem("执行成功");
          return newItems;
        });
      } else {
        
        setChainItems(prev => {
          const newItems = [...prev];
          newItems[itemKey] = updateItem("用户拒绝");
          newItems[itemKey].footer =  <ActionButtons onConfirm={() => {}} onReject={() => {}} disabled />;
          return newItems;
        });
      }
    };

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
        if(chunk?.data.includes("<think>")){
          startDate = Date.now();
          // 重置内容
          currentContentRef = '';
          currentItemIndex = 0;
        }
        if(chunk?.data.includes("</think>")){
          //思考完成，请求调用工具
          currentItemIndex++;
          const endTime = Date.now();
          const thinkTime = Math.round((endTime - startDate) / 1000);
          setChainItems(prev => {
            const newItems = [...prev];
            newItems[0].status= "success";
            newItems[0].description= `思考完成，用时${thinkTime}秒`;
            newItems[0].icon= getStatusIcon("success");
            console.log("思考完成"+currentContentRef);
            newItems[0].content= currentContentRef;
            newItems.push({
              key: `${currentItemIndex}`,
              title: "请求调用工具",
              description: "",
              icon: getStatusIcon('pending'),
              extra: <Button type="text" icon={<MoreOutlined />} />,
              status: "pending",
              content: ""
            })
            currentContentRef = '';
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
              const endTime = Date.now();
              const thinkTime = Math.round((endTime - startDate) / 1000);
              newItems[0].content = currentContentRef;
              newItems[0].description = `思考中...耗时${thinkTime}秒`;
              return newItems;
            });
          }
          } else if (chunk?.data?.includes('DONE')) {
            // 1. 解析 currentContentRef.current
            const content = currentContentRef;
            const result: Record<string, string> = {};
            // 匹配所有 <xxx>yyy</xxx>
            const regex = /<(\w+)>(.*?)<\/\1>/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
              // 排除最外层的 mcptool
              if (match[1] !== 'mcptool') {
                result[match[1]] = match[2];
              }
            }

            // 2. 转成字符串（这里用 JSON 字符串）
            const descriptionStr = JSON.stringify(result, null, 2);

            // 3. 更新 newItems
            setChainItems((prevItems) => {
              const newItems = [...prevItems];
              if (newItems[currentItemIndex]) {
                newItems[currentItemIndex].description = descriptionStr;
              }
              return newItems;
            });
          }
        } catch (error) {
          console.error(error);
        }
        delay(1000);
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
      resolveAbortController: (controller) => {
        abortController.current = controller;
      },
    });
  
    // ==================== Event ====================
    const handleUserSubmit = (val: string) => {
      onRequest({
        stream: true,
        message: { content: val, role: 'user' },
      });
      
      // session title mock
      if (sessionList.find((i) => i.key === curSession)?.label === 'New session') {
        setSessionList(
          sessionList.map((i) => (i.key !== curSession ? i : { ...i, label: val?.slice(0, 20) })),
        );
      }
    };
  
    const onPasteFile = (_: File, files: FileList) => {
      for (const file of files) {
        attachmentsRef.current?.upload(file);
      }
      setAttachmentsOpen(true);
    };
  
    // ==================== Nodes ====================
    const chatHeader = (
      <div className={styles.chatHeader}>
        <div className={styles.headerTitle}>✨ AI Copilot</div>
        <Space size={0}>
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={() => {
              if (messages?.length) {
                const timeNow = dayjs().valueOf().toString();
                abortController.current?.abort();
                // The abort execution will trigger an asynchronous requestFallback, which may lead to timing issues.
                // In future versions, the sessionId capability will be added to resolve this problem.
                setTimeout(() => {
                  setSessionList([
                    { key: timeNow, label: 'New session', group: 'Today' },
                    ...sessionList,
                  ]);
                  setCurSession(timeNow);
                  setMessages([]);
                }, 100);
              } else {
                message.error('It is now a new conversation.');
              }
            }}
            className={styles.headerButton}
          />
          <Popover
            placement="bottom"
            styles={{ body: { padding: 0, maxHeight: 600 } }}
            content={
              <Conversations
                items={sessionList?.map((i) =>
                  i.key === curSession ? { ...i, label: `[current] ${i.label}` } : i,
                )}
                activeKey={curSession}
                groupable
                onActiveChange={async (val) => {
                  abortController.current?.abort();
                  // The abort execution will trigger an asynchronous requestFallback, which may lead to timing issues.
                  // In future versions, the sessionId capability will be added to resolve this problem.
                  setTimeout(() => {
                    setCurSession(val);
                    setMessages(messageHistory?.[val] || []);
                  }, 100);
                }}
                styles={{ item: { padding: '0 8px' } }}
                className={styles.conversations}
              />
            }
          >
            <Button type="text" icon={<CommentOutlined />} className={styles.headerButton} />
          </Popover>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => setCopilotOpen(false)}
            className={styles.headerButton}
          />
        </Space>
      </div>
    );
    const chatList = (
      <div className={styles.chatList}>
        {messages?.length ? (
          /** 消息列表 */
          <Bubble.List
            style={{ height: '100%', paddingInline: 16 }}
            items={messages?.map((i) => ({
              ...i.message,
              classNames: {
                content: i.status === 'loading' ? styles.loadingMessage : '',
              },
              typing: i.status === 'loading' ? { step: 5, interval: 20, suffix: <>Gavin</> } : false,
            }))}
            roles={{
              assistant: {
                placement: 'start',
                footer: (
                  <div style={{ display: 'flex' }}>
                    <Button type="text" size="small" icon={<ReloadOutlined />} />
                    <Button type="text" size="small" icon={<CopyOutlined />} />
                    <Button type="text" size="small" icon={<LikeOutlined />} />
                    <Button type="text" size="small" icon={<DislikeOutlined />} />
                  </div>
                ),
                loadingRender: () => (
                  <Space>
                    <Spin size="small" />
                    {AGENT_PLACEHOLDER}
                  </Space>
                ),
              },
              user: { placement: 'end' },
            }}
          />
        ) : (
          /** 没有消息时的 welcome */
          <>
            <Welcome
              variant="borderless"
              title="👋 Hello, I'm Ant Design X"
              description="Base on Ant Design, AGI product interface solution, create a better intelligent vision~"
              className={styles.chatWelcome}
            />
  
            <Prompts
              vertical
              title="I can help："
              items={MOCK_QUESTIONS.map((i) => ({ key: i, description: i }))}
              onItemClick={(info) => handleUserSubmit(info?.data?.description as string)}
              style={{
               marginInline: 16
              }}
              styles={{
                title: { fontSize: 14 },
              }}
            />
          </>
        )}
      </div>
    );
    const sendHeader = (
      <Sender.Header
        title="Upload File"
        styles={{ content: { padding: 0 } }}
        open={attachmentsOpen}
        onOpenChange={setAttachmentsOpen}
        forceRender
      >
        <Attachments
          ref={attachmentsRef}
          beforeUpload={() => false}
          items={files}
          onChange={({ fileList }) => setFiles(fileList)}
          placeholder={(type) =>
            type === 'drop'
              ? { title: 'Drop file here' }
              : {
                icon: <CloudUploadOutlined />,
                title: 'Upload files',
                description: 'Click or drag files to this area to upload',
              }
          }
        />
      </Sender.Header>
    );
    const chatSender = (
      <div className={styles.chatSend}>
        <div className={styles.sendAction}>
          <Button
            icon={<ScheduleOutlined />}
            onClick={() => handleUserSubmit('What has Ant Design X upgraded?')}
          >
            Upgrades
          </Button>
          <Button
            icon={<ProductOutlined />}
            onClick={() => handleUserSubmit('What component assets are available in Ant Design X?')}
          >
            Components
          </Button>
          <Button icon={<AppstoreAddOutlined />}>More</Button>
        </div>
  
        {/** 输入框 */}
        <Suggestion items={MOCK_SUGGESTIONS} onSelect={(itemVal) => setInputValue(`[${itemVal}]:`)}>
          {({ onTrigger, onKeyDown }) => (
            <Sender
              loading={loading}
              value={inputValue}
              onChange={(v) => {
                onTrigger(v === '/');
                setInputValue(v);
              }}
              onSubmit={() => {
                handleUserSubmit(inputValue);
                setInputValue('');
              }}
              onCancel={() => {
                abortController.current?.abort();
              }}
              allowSpeech
              placeholder="Ask or input / use skills"
              onKeyDown={onKeyDown}
              header={sendHeader}
              prefix={
                <Button
                  type="text"
                  icon={<PaperClipOutlined style={{ fontSize: 18 }} />}
                  onClick={() => setAttachmentsOpen(!attachmentsOpen)}
                />
              }
              onPasteFile={onPasteFile}
              actions={(_, info) => {
                const { SendButton, LoadingButton, SpeechButton } = info.components;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <SpeechButton className={styles.speechButton} />
                    {loading ? <LoadingButton type="default" /> : <SendButton type="primary" />}
                  </div>
                );
              }}
            />
          )}
        </Suggestion>
      </div>
    );
  
    useEffect(() => {
      // history mock
      if (messages?.length) {
        setMessageHistory((prev) => ({
          ...prev,
          [curSession]: messages,
        }));
      }
    }, [messages]);
  
    return (
      <div className={styles.copilotChat} style={{ width: copilotOpen ? 750 : 0 }}>
        {/** 对话区 - header */}
        {chatHeader}
  
        {/** 对话区 - 消息列表 */}
        {chatList}
  
        {/** 对话区 - 输入框 */}
        {chatSender}
      </div>
    );
  };
  
  const useWorkareaStyle = createStyles(({ token, css }) => {
    return {
      copilotWrapper: css`
        height: 100vh;
        display: flex;
      `,
      workarea: css`
        flex: 1;
        background: ${token.colorBgLayout};
        display: flex;
        flex-direction: column;
      `,
      workareaHeader: css`
        box-sizing: border-box;
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 48px 0 28px;
        border-bottom: 1px solid ${token.colorBorder};
      `,
      headerTitle: css`
        font-weight: 600;
        font-size: 15px;
        color: ${token.colorText};
        display: flex;
        align-items: center;
        gap: 8px;
      `,
      headerButton: css`
        background-image: linear-gradient(78deg, #8054f2 7%, #3895da 95%);
        border-radius: 12px;
        height: 24px;
        width: 93px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        transition: all 0.3s;
        &:hover {
          opacity: 0.8;
        }
      `,
      workareaBody: css`
        flex: 1;
        padding: 16px;
        background: ${token.colorBgContainer};
        border-radius: 16px;
        min-height: 0;
      `,
      bodyContent: css`
        overflow: auto;
        height: 100%;
        padding-right: 10px;
      `,
      bodyText: css`
        color: ${token.colorText};
        padding: 8px;
      `,
    };
  });
  
  const CopilotDemo = () => {
    const { styles: workareaStyles } = useWorkareaStyle();
  
    // ==================== State =================
    const [copilotOpen, setCopilotOpen] = useState(true);
  
    // ==================== Render =================
    return (
      <div className={workareaStyles.copilotWrapper}>
        
        {/** 右侧对话区 */}
        <Copilot copilotOpen={copilotOpen} setCopilotOpen={setCopilotOpen} />
      </div>
    );
  };
  
  export default CopilotDemo;