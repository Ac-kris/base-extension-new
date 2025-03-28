import { useEffect, useState } from 'react';
import { bitable } from '@lark-base-open/js-sdk';
import { Select, Button, message, Spin, Alert } from 'antd';
import { MonthlyReportGenerator } from './MonthlyReportGenerator';
import { checkBitableConnection } from './dev-utils';
import './App.css';

interface TableOption {
  label: string;
  value: string;
}

// 定义表格信息接口，与API返回值匹配
interface TableMeta {
  id: string;
  name: string;
}

interface MonthOption {
  label: string;
  value: number;
}

// 月份选项
const MONTH_OPTIONS: MonthOption[] = Array.from({ length: 12 }, (_, index) => ({
  label: `${index + 1}月`,
  value: index + 1,
}));

function App() {
  const [tables, setTables] = useState<TableOption[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [isApiAvailable, setIsApiAvailable] = useState<boolean>(true);

  // 超时处理
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (initialLoading) {
        setInitialLoading(false);
        setIsApiAvailable(false);
        setErrorMessage('连接飞书多维表格API超时，请确保您在飞书多维表格中打开此应用。如果在开发环境中运行，请参考文档配置开发环境。');
      }
    }, 10000); // 10秒超时

    return () => clearTimeout(timeoutId);
  }, [initialLoading]);

  // 检查是否在飞书环境中运行
  useEffect(() => {
    const checkEnvironment = async () => {
      try {
        // 使用辅助函数检查API连接
        const isConnected = await checkBitableConnection();
        
        if (!isConnected) {
          setInitialLoading(false);
          setIsApiAvailable(false);
          setErrorMessage('请在飞书多维表格中打开此应用。如果在开发环境中运行，请参考文档配置开发环境。');
          return;
        }
      } catch (error) {
        console.error('环境检查失败:', error);
      }
    };
    
    checkEnvironment();
  }, []);

  // 获取表格列表
  useEffect(() => {
    async function loadTables() {
      if (!isApiAvailable) return;
      
      setInitialLoading(true);
      setErrorMessage(null);
      
      try {
        // 获取表格列表元数据
        const tableMetaList = await bitable.base.getTableMetaList();
        
        if (!tableMetaList || tableMetaList.length === 0) {
          setErrorMessage('未找到任何数据表，请先创建数据表');
          setInitialLoading(false);
          return;
        }
        
        const tableOptions = tableMetaList.map((table: TableMeta) => ({
          label: table.name || '未命名表格',
          value: table.id
        }));
        
        setTables(tableOptions);
        
        if (tableOptions.length > 0) {
          setSelectedTableId(tableOptions[0].value);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        setErrorMessage(`获取表格列表失败: ${errorMsg}`);
        messageApi.error('获取表格列表失败，请检查网络连接或刷新页面重试');
        console.error('获取表格列表失败:', error);
      } finally {
        setInitialLoading(false);
      }
    }
    
    loadTables();
  }, [messageApi, isApiAvailable]);

  // 生成月度汇总报告
  const generateReport = async () => {
    if (!selectedTableId) {
      messageApi.warning('请选择原数据表');
      return;
    }

    if (!selectedMonth) {
      messageApi.warning('请选择月份');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    
    try {
      const generator = new MonthlyReportGenerator();
      await generator.generate(selectedTableId, selectedMonth);
      messageApi.success('汇总表生成成功！');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      setErrorMessage(`生成汇总表失败: ${errorMsg}`);
      messageApi.error('生成汇总表失败，请查看详细错误信息');
      console.error('生成汇总表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="container loading-container">
        <Spin tip="连接飞书多维表格API中..." size="large" />
        <p style={{ marginTop: 16, color: '#666' }}>
          如果长时间未响应，请确保您在飞书多维表格中打开此应用
        </p>
      </div>
    );
  }

  if (!isApiAvailable) {
    return (
      <div className="container error-container">
        <Alert
          message="环境错误"
          description={errorMessage || "无法连接到飞书多维表格API，请确保您在飞书多维表格中打开此应用。"}
          type="error"
          showIcon
        />
        <div style={{ marginTop: 16 }}>
          <h3>本地开发配置指南</h3>
          <ol>
            <li>确保已正确配置开发环境，并且URL中包含 <code>debug=true</code> 和 <code>blockTypeID</code> 参数</li>
            <li>打开飞书多维表格网站：<a href="https://base.feishu.cn/" target="_blank" rel="noopener noreferrer">https://base.feishu.cn/</a></li>
            <li>创建一个多维表格或打开已有的多维表格</li>
            <li>点击右上角"+"号，选择"添加扩展"</li>
            <li>在扩展列表中，点击顶部的"开发者模式"</li>
            <li>在弹出的对话框中，输入当前页面的完整URL (包含 debug 和 blockTypeID 参数)</li>
            <li>点击"添加"按钮，完成本地开发环境的连接</li>
          </ol>
          <p>详细文档请参考：<a href="https://open.feishu.cn/document/uAjLw4CM/uYjL24iN/base-extensions/base-automation-extensions/base-record-view-extension-development-guide" target="_blank" rel="noopener noreferrer">飞书多维表格扩展开发指南</a></p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {contextHolder}
      
      <h1>制备费用月度汇总表生成器</h1>
      
      {errorMessage && (
        <div className="error-message">
          <Alert
            message="错误"
            description={errorMessage}
            type="error"
            showIcon
            closable
            onClose={() => setErrorMessage(null)}
          />
        </div>
      )}
      
      <div className="form-container">
        <div className="form-item">
          <label>选择原数据表</label>
          <Select 
            style={{ width: '100%' }}
            options={tables}
            value={selectedTableId}
            onChange={setSelectedTableId}
            placeholder="请选择原数据表"
            disabled={loading || tables.length === 0}
          />
        </div>
        
        <div className="form-item">
          <label>选择月份</label>
          <Select 
            style={{ width: '100%' }}
            options={MONTH_OPTIONS}
            value={selectedMonth}
            onChange={setSelectedMonth}
            placeholder="请选择月份"
            disabled={loading}
          />
        </div>
        
        <Button 
          type="primary" 
          onClick={generateReport}
          loading={loading}
          style={{ width: '100%' }}
          disabled={!selectedTableId || loading}
        >
          生成汇总表
        </Button>
      </div>
      
      {loading && (
        <div className="loading-container">
          <Spin tip="正在生成汇总表..." size="large" />
          <p>请耐心等待，数据处理可能需要一些时间...</p>
        </div>
      )}
    </div>
  );
}

export default App; 