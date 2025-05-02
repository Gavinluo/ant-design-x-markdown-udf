import React, { useState, ReactElement } from "react";
import { ThoughtChain } from "@ant-design/x";
import type { ThoughtChainProps, ThoughtChainItem } from "@ant-design/x";
import { CheckCircleOutlined, InfoCircleOutlined, LoadingOutlined, MoreOutlined } from "@ant-design/icons";
import { Card, Typography, Button, Space } from "antd";
import '@ant-design/v5-patch-for-react-19';

const { Text } = Typography;

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

const ThoughtChainDemo = () => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [items, setItems] = useState<ThoughtChainItem[]>([
    {
      key: 'think',
      title: "思考",
      description: "思考中...",
      icon: <CheckCircleOutlined />,
      extra: <Button type="text" icon={<MoreOutlined />} />,
      status: "success",
      content: "思考内容"
    },
    {
      key: '1',
      title: "请求调用 MCPTool",
      description: "参数1:1231232 ，参数2:232323，参数3:3333333333333333333333333333",
      icon: getStatusIcon('pending'),
      extra: <Button type="text" icon={<MoreOutlined />} />,
      status: "pending",
      footer: <ActionButtons 
        onConfirm={() => updateChainItem(1, 'success')} 
        onReject={() => updateChainItem(1, 'error')} 
      />,
      content: ""
    }
  ]);

  const updateChainItem = async (itemKey: number, status: ThoughtChainItem['status']) => {
    const updateItem = (content: string) => ({
      ...items[itemKey],
      content,
      status,
      icon: getStatusIcon(status),
      footer: <ActionButtons onConfirm={() => {}} onReject={() => {}} disabled />
    });

    if (status === "success") {
      setItems(prev => {
        const newItems = [...prev];
        newItems[itemKey] = updateItem("正在执行");
        return newItems;
      });
      
      await delay(1000);
      
      setItems(prev => {
        const newItems = [...prev];
        newItems[itemKey] = updateItem("执行成功");
        return newItems;
      });
    } else {
      setItems(prev => {
        const newItems = [...prev];
        newItems[itemKey] = updateItem("用户拒绝");
        return newItems;
      });
    }

    const currentKey = items[itemKey]?.key;
    if (currentKey) {
      setExpandedKeys([currentKey]);
    }
  };

  return (
    <Card style={{ width: 500 }}>
      <ThoughtChain 
        items={items} 
        collapsible={{
          expandedKeys,
          onExpand: setExpandedKeys
        }}
      />
    </Card>
  );
};

export default ThoughtChainDemo;
