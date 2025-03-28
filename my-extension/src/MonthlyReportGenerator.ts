import { 
  bitable, 
  FieldType, 
  ITable, 
  ICurrencyField, 
  INumberField, 
  ISingleSelectField, 
  IDateTimeField,
  NumberFormatter,
  CurrencyCode
} from '@lark-base-open/js-sdk';

/**
 * 月度制备费汇总表生成器
 */
export class MonthlyReportGenerator {
  // 源表字段名称
  private readonly SOURCE_FIELD_NAMES = {
    PRODUCT_CATEGORY: '产品类别',
    OUT_DATE: '申请出库日期',
    USE_DATE: '使用日期',
    SHARES: '份数',
    PREPARATION_FEE: '制备费',
    REWARD_DEDUCTION: '出库订单（多单）奖励扣减',
    CANCEL_FEE: '制剂取消收取费用',
    URGENT_FEE: '制剂加急/非正常出库时间收取费用'
  };

  // 目标表字段名称
  private readonly TARGET_FIELD_NAMES = {
    INDEX: '序号',
    PROJECT: '项目',
    PERSON_COUNT: '人数',
    SHARES: '份数',
    PREPARATION_FEE: '制备费',
    REWARD_DEDUCTION: '出库订单奖励扣减',
    CANCEL_FEE: '制剂取消收取费用',
    URGENT_FEE: '制剂加急/非正常出库时间收取费用'
  };

  /**
   * 生成月度汇总表
   * @param sourceTableId 源表ID
   * @param month 月份(1-12)
   */
  public async generate(sourceTableId: string, month: number): Promise<void> {
    if (!sourceTableId) {
      throw new Error('源表ID不能为空');
    }
    
    if (month < 1 || month > 12) {
      throw new Error('月份必须在1-12之间');
    }
    
    try {
      // 获取源表
      const sourceTable = await bitable.base.getTableById(sourceTableId);
      if (!sourceTable) {
        throw new Error(`未找到ID为 ${sourceTableId} 的表格`);
      }
      
      // 创建新表
      const monthStr = String(month);
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const newTableName = `${year}年${monthStr}月支付细胞工程制剂制备费`;
      
      console.log(`正在创建新表: ${newTableName}`);
      
      // 修复addTable的参数类型，添加必要的fields属性
      const newTableResult = await bitable.base.addTable({ 
        name: newTableName,
        fields: []
      });
      
      if (!newTableResult || !newTableResult.tableId) {
        throw new Error('创建新表失败');
      }
      
      // 获取新创建的表
      const newTable = await bitable.base.getTableById(newTableResult.tableId);
      if (!newTable) {
        throw new Error(`无法访问新创建的表格: ${newTableResult.tableId}`);
      }
      
      console.log('创建字段中...');
      // 创建字段
      await this.createFields(newTable);
      
      console.log('获取源表数据中...');
      // 获取源表中的数据
      const sourceData = await this.getSourceData(sourceTable, month);
      
      // 检查是否找到符合条件的数据
      if (Object.keys(sourceData).length === 0) {
        throw new Error(`未找到${month}月的数据，请确认原表中存在该月份的记录`);
      }
      
      console.log('写入数据到新表中...');
      // 将数据写入新表
      await this.writeDataToNewTable(newTable, sourceData);
      
      // 尝试应用更多视图设置
      await this.applyViewSettings(newTable, month, year);
      
      console.log('汇总表生成完成');
    } catch (error) {
      console.error('生成汇总表时发生错误:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('生成汇总表时发生未知错误');
      }
    }
  }
  
  /**
   * 创建字段
   */
  private async createFields(table: ITable): Promise<void> {
    try {
      // 不再创建序号字段
      // 项目（文本类型，不再使用单选类型）
      await table.addField({
        type: FieldType.Text,
        name: this.TARGET_FIELD_NAMES.PROJECT
      });
      
      // 人数（整数数字）
      await table.addField({
        type: FieldType.Number,
        name: this.TARGET_FIELD_NAMES.PERSON_COUNT,
        property: {
          formatter: NumberFormatter.INTEGER
        }
      });
      
      // 份数（带2位小数的数字）
      await table.addField({
        type: FieldType.Number,
        name: this.TARGET_FIELD_NAMES.SHARES,
        property: {
          formatter: NumberFormatter.DIGITAL_ROUNDED_2
        }
      });
      
      // 制备费（金额，2位小数）
      await table.addField({
        type: FieldType.Currency,
        name: this.TARGET_FIELD_NAMES.PREPARATION_FEE,
        property: {
          currencyCode: CurrencyCode.CNY
        }
      });
      
      // 出库订单奖励扣减（金额，2位小数）
      await table.addField({
        type: FieldType.Currency,
        name: this.TARGET_FIELD_NAMES.REWARD_DEDUCTION,
        property: {
          currencyCode: CurrencyCode.CNY
        }
      });
      
      // 制剂取消收取费用（金额，2位小数）
      await table.addField({
        type: FieldType.Currency,
        name: this.TARGET_FIELD_NAMES.CANCEL_FEE,
        property: {
          currencyCode: CurrencyCode.CNY
        }
      });
      
      // 制剂加急/非正常出库时间收取费用（金额，2位小数）
      await table.addField({
        type: FieldType.Currency,
        name: this.TARGET_FIELD_NAMES.URGENT_FEE,
        property: {
          currencyCode: CurrencyCode.CNY
        }
      });

      // 尝试应用表格样式设置
      await this.configureTableStyle(table);
    } catch (error) {
      console.error('创建字段时发生错误:', error);
      throw new Error('创建字段失败，请检查字段配置');
    }
  }
  
  /**
   * 配置表格样式
   * 注意：由于API限制，我们可能无法直接设置所有样式
   */
  private async configureTableStyle(table: ITable): Promise<void> {
    try {
      // 获取表格视图列表
      const viewMetaList = await table.getViewMetaList();
      if (viewMetaList && viewMetaList.length > 0) {
        // 获取默认视图
        const defaultViewId = viewMetaList[0].id;
        const view = await table.getViewById(defaultViewId);
        
        if (view) {
          // 尝试配置视图
          console.log('正在配置表格视图...');
          
          // 我们无法直接设置居中和置顶的样式，但可以通过配置字段宽度等来提高可读性
          // 由于API限制，某些样式设置可能无法实现
          
          // 可以在此处添加支持的视图配置
          // 例如，如果有支持设置视图名称的API
          // await view.setName(`${new Date().getFullYear()}年${month}月汇总表 - 美化版`);
          
          console.log('已完成表格视图基本配置');
        }
      }
    } catch (error) {
      console.warn('配置表格样式时发生错误:', error);
      // 继续执行，不中断主要功能
    }
  }
  
  /**
   * 获取源表数据
   */
  private async getSourceData(sourceTable: ITable, month: number): Promise<Record<string, any>> {
    try {
      // 获取字段元数据
      const fields = await sourceTable.getFieldMetaList();
      if (!fields || fields.length === 0) {
        throw new Error('源表中没有找到任何字段');
      }
      
      // 获取字段ID
      const productCategoryFieldId = fields.find(field => field.name === this.SOURCE_FIELD_NAMES.PRODUCT_CATEGORY)?.id;
      // const outDateFieldId = fields.find(field => field.name === this.SOURCE_FIELD_NAMES.OUT_DATE)?.id;
      const useDateFieldId = fields.find(field => field.name === this.SOURCE_FIELD_NAMES.USE_DATE)?.id;
      const sharesFieldId = fields.find(field => field.name === this.SOURCE_FIELD_NAMES.SHARES)?.id;
      const preparationFeeFieldId = fields.find(field => field.name === this.SOURCE_FIELD_NAMES.PREPARATION_FEE)?.id;
      const rewardDeductionFieldId = fields.find(field => field.name === this.SOURCE_FIELD_NAMES.REWARD_DEDUCTION)?.id;
      const cancelFeeFieldId = fields.find(field => field.name === this.SOURCE_FIELD_NAMES.CANCEL_FEE)?.id;
      const urgentFeeFieldId = fields.find(field => field.name === this.SOURCE_FIELD_NAMES.URGENT_FEE)?.id;
      
      // 验证缺失的字段
      const missingFields = [];
      if (!productCategoryFieldId) missingFields.push(this.SOURCE_FIELD_NAMES.PRODUCT_CATEGORY);
      // if (!outDateFieldId) missingFields.push(this.SOURCE_FIELD_NAMES.OUT_DATE);
      if (!useDateFieldId) missingFields.push(this.SOURCE_FIELD_NAMES.USE_DATE);
      if (!sharesFieldId) missingFields.push(this.SOURCE_FIELD_NAMES.SHARES);
      if (!preparationFeeFieldId) missingFields.push(this.SOURCE_FIELD_NAMES.PREPARATION_FEE);
      if (!rewardDeductionFieldId) missingFields.push(this.SOURCE_FIELD_NAMES.REWARD_DEDUCTION);
      if (!cancelFeeFieldId) missingFields.push(this.SOURCE_FIELD_NAMES.CANCEL_FEE);
      if (!urgentFeeFieldId) missingFields.push(this.SOURCE_FIELD_NAMES.URGENT_FEE);
      
      if (missingFields.length > 0) {
        throw new Error(`源表中缺少以下必要的字段: ${missingFields.join(', ')}`);
      }
      
      // 获取字段对象 - 使用非空断言操作符，因为上面已经验证了字段ID非空
      const productCategoryField = await sourceTable.getField<ISingleSelectField>(productCategoryFieldId!);
      // const outDateField = await sourceTable.getField<IDateTimeField>(outDateFieldId!);
      const useDateField = await sourceTable.getField<IDateTimeField>(useDateFieldId!);
      const sharesField = await sourceTable.getField<INumberField>(sharesFieldId!);
      const preparationFeeField = await sourceTable.getField<ICurrencyField>(preparationFeeFieldId!);
      const rewardDeductionField = await sourceTable.getField<ICurrencyField>(rewardDeductionFieldId!);
      const cancelFeeField = await sourceTable.getField<ICurrencyField>(cancelFeeFieldId!);
      const urgentFeeField = await sourceTable.getField<ICurrencyField>(urgentFeeFieldId!);
      
      // 获取记录ID列表
      const recordIdList = await sourceTable.getRecordIdList();
      if (!recordIdList || recordIdList.length === 0) {
        throw new Error('源表中没有找到任何记录');
      }
      
      console.log(`共找到 ${recordIdList.length} 条记录，准备处理...`);
      
      // 打印所有字段的元数据，帮助调试
      console.log('制备费字段元数据:', JSON.stringify(await preparationFeeField.getMeta(), null, 2));
      console.log('出库订单奖励扣减字段元数据:', JSON.stringify(await rewardDeductionField.getMeta(), null, 2));
      console.log('制剂取消收取费用字段元数据:', JSON.stringify(await cancelFeeField.getMeta(), null, 2));
      console.log('制剂加急/非正常出库时间收取费用字段元数据:', JSON.stringify(await urgentFeeField.getMeta(), null, 2));
      
      // 分组数据
      const groupedData: Record<string, {
        count: number;
        shares: number;
        preparationFee: number;
        rewardDeduction: number;
        cancelFee: number;
        urgentFee: number;
      }> = {};
      
      let processedRecordCount = 0;
      let matchedRecordCount = 0;
      
      // 获取一条记录的所有字段值，用于调试
      if (recordIdList.length > 0) {
        const sampleRecordId = recordIdList[0];
        try {
          const allFields = await sourceTable.getFieldMetaList();
          console.log('第一条记录的所有字段值:');
          for (const field of allFields) {
            const fieldObj = await sourceTable.getField(field.id);
            const value = await fieldObj.getValue(sampleRecordId);
            console.log(`字段 "${field.name}" (${field.type}): ${JSON.stringify(value)}`);
          }
        } catch (error) {
          console.warn('获取样本记录失败:', error);
        }
      }
      
      // 安全获取数值并累加 - 重写这个函数来处理各种可能的值格式
      const safeGetNumberValue = async (field: INumberField | ICurrencyField, recordId: string, fieldName: string): Promise<number> => {
        try {
          // 使用any类型获取值，以避免TypeScript类型检查问题
          const rawValue: any = await field.getValue(recordId);
          console.log(`字段 "${fieldName}" 值类型: ${typeof rawValue}, 原始值: ${JSON.stringify(rawValue)}`);
          
          // 空值检查
          if (rawValue === null || rawValue === undefined) return 0;
          
          // 尝试从字段元数据获取字段类型
          const fieldMeta = await field.getMeta();
          console.log(`字段 "${fieldName}" 元数据: ${JSON.stringify(fieldMeta)}`);
          
          // 直接尝试转为数字
          let numValue = Number(rawValue);
          if (!isNaN(numValue)) {
            console.log(`  直接转换成功: ${numValue}`);
            return numValue;
          }
          
          // 对象处理
          if (typeof rawValue === 'object' && rawValue !== null) {
            // 尝试常见的属性名
            const possibleProps = ['value', 'amount', 'number', 'num'];
            for (const prop of possibleProps) {
              if (rawValue[prop] !== undefined) {
                numValue = Number(rawValue[prop]);
                if (!isNaN(numValue)) {
                  console.log(`  从对象属性 "${prop}" 提取的值: ${numValue}`);
                  return numValue;
                }
              }
            }
            
            // 处理数组
            if (Array.isArray(rawValue) && rawValue.length > 0) {
              // 对于数组的第一个元素
              const firstItem = rawValue[0];
              if (typeof firstItem === 'object' && firstItem !== null) {
                // 检查是否有text属性
                if (firstItem.text !== undefined) {
                  const textStr = String(firstItem.text);
                  // 提取数字
                  const numMatch = textStr.match(/-?\d+(\.\d+)?/);
                  if (numMatch) {
                    numValue = Number(numMatch[0]);
                    console.log(`  从数组对象text属性提取的值: ${numValue}`);
                    return numValue;
                  }
                }
              } else if (typeof firstItem === 'string' || typeof firstItem === 'number') {
                // 直接使用数组的第一个元素
                numValue = Number(firstItem);
                if (!isNaN(numValue)) {
                  console.log(`  从数组第一个元素提取的值: ${numValue}`);
                  return numValue;
                }
              }
            }
            
            // 货币可能有特殊格式，比如包含货币代码等
            const strValue = JSON.stringify(rawValue);
            const numMatch = strValue.match(/-?\d+(\.\d+)?/);
            if (numMatch) {
              numValue = Number(numMatch[0]);
              console.log(`  从JSON字符串提取的值: ${numValue}`);
              return numValue;
            }
          }
          
          // 字符串处理
          if (typeof rawValue === 'string') {
            // 提取所有数字部分
            const numMatch = rawValue.match(/-?\d+(\.\d+)?/);
            if (numMatch) {
              numValue = Number(numMatch[0]);
              console.log(`  从字符串提取的值: ${numValue}`);
              return numValue;
            }
          }
          
          // 如果所有尝试都失败，返回0
          console.warn(`  无法从字段 "${fieldName}" 中提取有效数值`);
          return 0;
        } catch (error) {
          console.warn(`获取字段 "${fieldName}" 值失败:`, error);
          return 0;
        }
      };
      
      // 遍历记录
      for (const recordId of recordIdList) {
        try {
          // 获取日期值（现在使用使用日期替代申请出库日期）
          const useDateValue = await useDateField.getValue(recordId);
          
          // 检查是否有使用日期值
          if (!useDateValue) {
            console.warn(`记录 ${recordId} 没有使用日期，已跳过`);
            continue;
          }
          
          // 解析使用日期
          let useDate: Date;
          try {
            useDate = new Date(useDateValue);
            
            // 检查日期是否有效
            if (isNaN(useDate.getTime())) {
              console.warn(`记录 ${recordId} 的使用日期格式无效: ${useDateValue}`);
              continue;
            }
          } catch (error) {
            console.warn(`解析记录 ${recordId} 的使用日期时出错: ${useDateValue}`);
            continue;
          }
          
          const useDateMonth = useDate.getMonth() + 1; // 月份从0开始，需要+1
          
          // 筛选指定月份的记录
          if (useDateMonth !== month) {
            // 不符合月份条件，跳过
            continue;
          }
          
          matchedRecordCount++;
          
          // 获取产品类别
          const productCategory = await productCategoryField.getValue(recordId);
          
          // 如果没有产品类别则跳过
          if (!productCategory) {
            console.warn(`记录 ${recordId} 没有产品类别，已跳过`);
            continue;
          }
          
          // 将产品类别值转换为字符串，处理可能的对象格式
          let categoryKey = '';
          
          // 检查是否是对象类型
          if (typeof productCategory === 'object' && productCategory !== null) {
            // 尝试从对象中提取text或name属性
            if ('text' in productCategory && productCategory.text) {
              categoryKey = String(productCategory.text);
            } else if ('name' in productCategory && productCategory.name) {
              categoryKey = String(productCategory.name);
            } else {
              // 如果对象中没有有效属性，使用JSON字符串
              categoryKey = JSON.stringify(productCategory);
            }
          } else {
            // 不是对象，直接转字符串
            categoryKey = String(productCategory);
          }
          
          console.log(`处理记录 ${recordId}: 产品类别="${categoryKey}"`);
          
          // 初始化分组数据
          if (!groupedData[categoryKey]) {
            groupedData[categoryKey] = {
              count: 0,
              shares: 0,
              preparationFee: 0,
              rewardDeduction: 0,
              cancelFee: 0,
              urgentFee: 0
            };
          }
          
          // 累加计数
          groupedData[categoryKey].count += 1;
          
          // 累加份数
          const shares = await safeGetNumberValue(sharesField, recordId, this.SOURCE_FIELD_NAMES.SHARES);
          groupedData[categoryKey].shares += shares;
          
          // 累加制备费
          const preparationFee = await safeGetNumberValue(preparationFeeField, recordId, this.SOURCE_FIELD_NAMES.PREPARATION_FEE);
          groupedData[categoryKey].preparationFee += preparationFee;
          
          // 累加出库订单奖励扣减
          const rewardDeduction = await safeGetNumberValue(rewardDeductionField, recordId, this.SOURCE_FIELD_NAMES.REWARD_DEDUCTION);
          groupedData[categoryKey].rewardDeduction += rewardDeduction;
          
          // 累加制剂取消收取费用
          const cancelFee = await safeGetNumberValue(cancelFeeField, recordId, this.SOURCE_FIELD_NAMES.CANCEL_FEE);
          groupedData[categoryKey].cancelFee += cancelFee;
          
          // 累加制剂加急/非正常出库时间收取费用
          const urgentFee = await safeGetNumberValue(urgentFeeField, recordId, this.SOURCE_FIELD_NAMES.URGENT_FEE);
          groupedData[categoryKey].urgentFee += urgentFee;
          
          console.log(`记录 ${recordId} 数据: 份数=${shares}, 制备费=${preparationFee}, 订单扣减=${rewardDeduction}, 取消费用=${cancelFee}, 加急费用=${urgentFee}`);
          
          processedRecordCount++;
        } catch (error) {
          console.warn(`处理记录 ${recordId} 时发生错误:`, error);
          // 继续处理下一条记录，不中断整个处理流程
        }
      }
      
      console.log(`处理完成。共处理 ${processedRecordCount} 条记录，${matchedRecordCount} 条匹配指定月份，得到 ${Object.keys(groupedData).length} 个产品类别分组`);
      
      return groupedData;
    } catch (error) {
      console.error('获取源表数据时发生错误:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('获取源表数据时发生未知错误');
      }
    }
  }
  
  /**
   * 将数据写入新表
   */
  private async writeDataToNewTable(newTable: ITable, groupedData: Record<string, any>): Promise<void> {
    try {
      // 获取字段元数据
      const fields = await newTable.getFieldMetaList();
      if (!fields || fields.length === 0) {
        throw new Error('新表中没有找到任何字段');
      }
      
      // 获取字段ID - 移除indexFieldId
      const projectFieldId = fields.find(field => field.name === this.TARGET_FIELD_NAMES.PROJECT)?.id;
      const personCountFieldId = fields.find(field => field.name === this.TARGET_FIELD_NAMES.PERSON_COUNT)?.id;
      const sharesFieldId = fields.find(field => field.name === this.TARGET_FIELD_NAMES.SHARES)?.id;
      const preparationFeeFieldId = fields.find(field => field.name === this.TARGET_FIELD_NAMES.PREPARATION_FEE)?.id;
      const rewardDeductionFieldId = fields.find(field => field.name === this.TARGET_FIELD_NAMES.REWARD_DEDUCTION)?.id;
      const cancelFeeFieldId = fields.find(field => field.name === this.TARGET_FIELD_NAMES.CANCEL_FEE)?.id;
      const urgentFeeFieldId = fields.find(field => field.name === this.TARGET_FIELD_NAMES.URGENT_FEE)?.id;
      
      // 验证缺失的字段 - 移除对indexFieldId的检查
      const missingFields = [];
      if (!projectFieldId) missingFields.push(this.TARGET_FIELD_NAMES.PROJECT);
      if (!personCountFieldId) missingFields.push(this.TARGET_FIELD_NAMES.PERSON_COUNT);
      if (!sharesFieldId) missingFields.push(this.TARGET_FIELD_NAMES.SHARES);
      if (!preparationFeeFieldId) missingFields.push(this.TARGET_FIELD_NAMES.PREPARATION_FEE);
      if (!rewardDeductionFieldId) missingFields.push(this.TARGET_FIELD_NAMES.REWARD_DEDUCTION);
      if (!cancelFeeFieldId) missingFields.push(this.TARGET_FIELD_NAMES.CANCEL_FEE);
      if (!urgentFeeFieldId) missingFields.push(this.TARGET_FIELD_NAMES.URGENT_FEE);
      
      if (missingFields.length > 0) {
        throw new Error(`新表字段创建失败，缺少字段: ${missingFields.join(', ')}`);
      }
      
      // 获取字段对象 - 使用非空断言操作符，因为上面已经验证了字段ID非空
      // 注意：projectField现在是文本字段而不是单选字段
      const projectField = await newTable.getField(projectFieldId!);
      const personCountField = await newTable.getField(personCountFieldId!);
      const sharesField = await newTable.getField(sharesFieldId!);
      const preparationFeeField = await newTable.getField(preparationFeeFieldId!);
      const rewardDeductionField = await newTable.getField(rewardDeductionFieldId!);
      const cancelFeeField = await newTable.getField(cancelFeeFieldId!);
      const urgentFeeField = await newTable.getField(urgentFeeFieldId!);
      
      console.log(`开始写入 ${Object.keys(groupedData).length} 条汇总数据...`);
      
      try {
        // 尝试使用批量添加记录的方式（更高效）
        const records = Object.entries(groupedData).map(([productCategory, data]) => {
          // 确保所有字段ID都存在
          if (!projectFieldId || !personCountFieldId || !sharesFieldId || 
              !preparationFeeFieldId || !rewardDeductionFieldId || !cancelFeeFieldId || !urgentFeeFieldId) {
            throw new Error('字段ID不完整，无法创建记录');
          }
          
          // 对数值进行四舍五入，确保只保留两位小数
          const roundedShares = Math.round(data.shares * 100) / 100;
          const roundedPreparationFee = Math.round(data.preparationFee * 100) / 100;
          const roundedRewardDeduction = Math.round(data.rewardDeduction * 100) / 100;
          const roundedCancelFee = Math.round(data.cancelFee * 100) / 100;
          const roundedUrgentFee = Math.round(data.urgentFee * 100) / 100;
          
          console.log(`添加记录：产品类别="${productCategory}", 人数=${data.count}, 份数=${roundedShares}, 制备费=${roundedPreparationFee}, 奖励扣减=${roundedRewardDeduction}, 取消费用=${roundedCancelFee}, 加急费用=${roundedUrgentFee}`);
          
          return {
            fields: {
              [projectFieldId]: productCategory, // 直接使用产品类别文本
              [personCountFieldId]: data.count,
              [sharesFieldId]: roundedShares,
              [preparationFeeFieldId]: roundedPreparationFee,
              [rewardDeductionFieldId]: roundedRewardDeduction,
              [cancelFeeFieldId]: roundedCancelFee,
              [urgentFeeFieldId]: roundedUrgentFee
            }
          };
        });
        
        console.log('准备添加的记录:', JSON.stringify(records, null, 2));
        
        if (records.length > 0) {
          await newTable.addRecords(records);
          console.log(`成功批量添加 ${records.length} 条记录`);
          return;
        }
      } catch (error) {
        console.warn('批量添加记录失败，将回退到单条添加模式:', error);
        // 如果批量添加失败，继续使用单条添加的方式
      }
      
      // 遍历分组数据，创建记录（单条添加方式）
      let successCount = 0;
      for (const [productCategory, data] of Object.entries(groupedData)) {
        try {
          // 创建新记录
          const recordId = await newTable.addRecord();
          
          // 对数值进行四舍五入，确保只保留两位小数
          const roundedShares = Math.round(data.shares * 100) / 100;
          const roundedPreparationFee = Math.round(data.preparationFee * 100) / 100;
          const roundedRewardDeduction = Math.round(data.rewardDeduction * 100) / 100;
          const roundedCancelFee = Math.round(data.cancelFee * 100) / 100;
          const roundedUrgentFee = Math.round(data.urgentFee * 100) / 100;
          
          console.log(`单条添加：产品类别="${productCategory}", 人数=${data.count}, 份数=${roundedShares}, 制备费=${roundedPreparationFee}, 奖励扣减=${roundedRewardDeduction}, 取消费用=${roundedCancelFee}, 加急费用=${roundedUrgentFee}`);
          
          // 设置项目（产品类别）- 文本字段直接设置值
          await projectField.setValue(recordId, productCategory);
          
          // 设置人数
          await personCountField.setValue(recordId, data.count);
          
          // 设置份数（四舍五入保留2位小数）
          await sharesField.setValue(recordId, roundedShares);
          
          // 设置制备费
          await preparationFeeField.setValue(recordId, roundedPreparationFee);
          
          // 设置出库订单奖励扣减
          await rewardDeductionField.setValue(recordId, roundedRewardDeduction);
          
          // 设置制剂取消收取费用
          await cancelFeeField.setValue(recordId, roundedCancelFee);
          
          // 设置制剂加急/非正常出库时间收取费用
          await urgentFeeField.setValue(recordId, roundedUrgentFee);
          
          successCount++;
        } catch (error) {
          console.error(`添加记录 ${productCategory} 时发生错误:`, error);
        }
      }
      
      console.log(`成功添加 ${successCount} 条记录，共 ${Object.keys(groupedData).length} 条`);
      
      if (successCount === 0) {
        throw new Error('没有成功写入任何记录');
      } else if (successCount < Object.keys(groupedData).length) {
        console.warn(`部分记录写入失败: ${successCount}/${Object.keys(groupedData).length}`);
      }
    } catch (error) {
      console.error('写入数据到新表时发生错误:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('写入数据到新表时发生未知错误');
      }
    }
  }

  /**
   * 应用更多视图设置
   * 尝试设置视图的标题、颜色和其他可能支持的样式
   */
  private async applyViewSettings(table: ITable, month: number, year: number): Promise<void> {
    try {
      const viewMetaList = await table.getViewMetaList();
      
      if (!viewMetaList || viewMetaList.length === 0) {
        console.warn('未找到任何视图配置');
        return;
      }
      
      // 获取默认视图
      const defaultViewId = viewMetaList[0].id;
      const view = await table.getViewById(defaultViewId);
      
      // 获取所有字段信息，用于调整宽度和显示顺序
      const fields = await table.getFieldMetaList();
      
      if (view && fields) {
        // 尝试一些可能支持的视图设置
        console.log('正在应用表格视图设置...');
        
        // 注意：此变量暂时未使用，但保留以备将来扩展功能
        /*const fieldIds = fields
          .filter(field => field.name !== this.TARGET_FIELD_NAMES.INDEX)
          .map(field => field.id);*/
        
        // 获取所有字段ID，但排除序号字段（如果存在）
        // const fieldIds = fields
        //   .filter(field => field.name !== this.TARGET_FIELD_NAMES.INDEX)
        //   .map(field => field.id);
        
        // 设置视图名称（如果API支持）
        try {
          if ('setName' in view) {
            // 在某些API版本中可能不支持此方法
            // @ts-ignore 忽略类型检查错误
            await view.setName(`${year}年${month}月制备费汇总`);
            console.log('已设置视图名称');
          }
        } catch (e) {
          console.warn('设置视图名称失败，API可能不支持此功能');
        }
        
        console.log('已完成表格视图设置');
      }
    } catch (error) {
      console.warn('应用视图设置时发生错误:', error);
      // 样式设置失败不影响核心功能，继续执行
    }
  }
} 