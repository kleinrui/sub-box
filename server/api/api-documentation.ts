/** API Token 可调用的操作，也是公开 OpenAPI 的白名单。新增操作必须同时补充说明。 */
export const apiOperations: Record<string, { summary: string; description: string; input?: string }> = {};

const resources = {
  user: ["用户", "包含订阅密钥和指定的订阅转换器。", "同时删除该用户与所有节点客户端的关联。"],
  node: ["节点", "节点是节点客户端的容器；创建节点后需创建 nodeClient 并关联用户。", "同时删除节点下全部客户端及其用户关联。"],
  nodeClient: ["节点客户端", "url 是代理分享链接或外部订阅地址；nodeId 指向所属节点。", "同时删除该客户端与所有用户的关联。"],
  subconverter: ["订阅转换器", "url 为转换服务地址，options 是 URL 查询参数字符串。", "使用它的用户的 subconverterId 会被清空。"],
  clashConfig: ["Clash 配置", "globalConfig 和 rules 都是 YAML 字符串。", "配置删除后将无法用于订阅合并。"],
} as const;
for (const [resource, [label, detail, cascade]] of Object.entries(resources)) {
  apiOperations[`${resource}.getAll`] = { summary: `列出所有${label}`, description: `返回${label}数组，无分页。${detail}先查询并确认记录 ID，再修改或删除。` };
  apiOperations[`${resource}.getById`] = {
    summary: `读取一个${label}`,
    description: `返回${label}对象；不存在时返回 null。${detail}`,
    input: `${label} ID 字符串。传入字符串本身，不是 {id: ...}。`,
  };
  apiOperations[`${resource}.create`] = {
    summary: `创建${label}`,
    description: `新建并返回完整${label}对象。ID、createdAt、updatedAt 由服务端生成；不要传 id。${detail}网络结果不明确时先查询，避免重复创建。`,
  };
  apiOperations[`${resource}.update`] = { summary: `修改${label}`, description: `按 id 局部修改，data 中省略的字段保持原值。返回更新后的完整对象；不存在时返回错误。${detail}` };
  apiOperations[`${resource}.delete`] = {
    summary: `删除${label}`,
    description: `按 ID 删除，不可撤销。${cascade}先查询确认目标；返回 {success: true}，即使目标原本不存在也可能成功。`,
    input: `要删除的${label} ID 字符串，不是对象。`,
  };
}
Object.assign(apiOperations, {
  "node.getAllWithClients": {
    summary: "列出节点及客户端和用户关联",
    description: "返回节点数组；每个节点的 items 是客户端数组，每个客户端的 users 含 userId、enable、order。用于整体检查节点与用户关系。",
  },
  "nodeClient.getUserClientOptions": {
    summary: "查询客户端的用户关联",
    description: "返回指定客户端的用户关联数组，含 userId、nodeClientId、enable 和 order，按 order 排序。修改关联前先读取。",
    input: "节点客户端 ID 字符串。",
  },
  "nodeClient.setUserClientOptions": {
    summary: "替换客户端关联的用户集合",
    description:
      "userIds 是最终完整用户列表，不是要追加的列表。未列出的现有关联会被删除；空数组会解除全部关联。已有用户的 enable/order 保持不变；defaultOptions 仅用于新关联，默认 enable=true，order 自动分配。追加用户时先查询并合并原有 ID。返回 {success: true}。",
  },
  "nodeClient.updateUserClientOption": {
    summary: "修改一个用户与客户端的关联选项",
    description: "按 nodeClientId 和 userId 定位现有关联，局部修改 enable/order；不会创建新关联。返回完整关联记录，不存在时返回错误。",
  },
  "nodeClient.setUserClientOption": {
    summary: "添加或修改一个用户与客户端的关联",
    description:
      "按 nodeClientId 和 userId 精确保存一个关联，不影响其他用户。用户或客户端不存在时返回错误。已有时仅更新 data 中明确提供的 enable/order；省略的字段保持原值。新增默认 enable=true，order 追加到该用户现有客户端末尾。返回完整关联记录，可安全重试。",
  },
  "nodeClient.removeUserClientOption": {
    summary: "取消一个用户与客户端的关联",
    description: "按 nodeClientId 和 userId 精确取消关联，不删除客户端，也不影响其他用户。返回 {success: true}，关联原本不存在时也成功。全局删除客户端使用 nodeClient.delete。",
  },
  "nodeClient.getNodeClientsWithUsers": { summary: "列出客户端及其用户关联", description: "返回客户端数组，每个客户端的 users 包含 userId、enable 和 order，按 order 排序。" },
  "nodeClient.getByUserId": {
    summary: "查询用户关联的客户端",
    description: "返回用户关联的客户端数组，附 enable 和 order。包含已禁用项；不要假定结果已排序，需要时按 order 排序。",
    input: "用户 ID 字符串。",
  },
  "subconverter.verifyUrl": {
    summary: "验证订阅转换器连接",
    description: "请求给定地址的 /version，返回版本文本；无法连接时返回错误。不写入数据库。",
    input: "订阅转换器根 URL，不带末尾斜杠，例如 https://converter.example.com。",
  },
  "subscription.generateSubscription": {
    summary: "生成用户的 Clash 订阅",
    description: "读取用户已启用的节点客户端并调用订阅转换器，返回 Clash YAML 字符串。subconverterId 可指定转换器；省略时使用服务端默认选择。可能访问外部服务。",
  },
  "clashConfig.mergeConfig": {
    summary: "将配置合并到 Clash YAML",
    description: "读取 configId 的配置，将全局配置合并到 baseYaml 并前置 rules，返回合并后的 YAML 字符串。不保存结果；配置不存在时返回错误。",
  },
  "export.exportAll": {
    summary: "导出全部业务数据",
    description:
      "返回 users、nodes、nodeClients、userClientOptions、subconverters、clashConfigs 六组数组。包含订阅密钥、节点链接等敏感数据；不含管理员密码、API Token 或 Token 哈希。",
  },
});

export const apiFieldDescriptions: Record<string, string> = {
  result: "tRPC 成功响应包装。",
  json: "SuperJSON 序列化后的值。",
  message: "错误原因。",
  code: "错误代码：外层为 JSON-RPC 数值，data.code 为 tRPC 字符串。",
  httpStatus: "对应的 HTTP 状态码。",
  path: "发生错误的 procedure 名称。",
  stack: "开发环境的调试堆栈；生产环境不应依赖此字段。",
  zodError: "参数校验详情；非参数校验错误时为 null。",
  formErrors: "作用于整个输入的校验错误。",
  fieldErrors: "按字段名分组的校验错误。",

  id: "记录 ID；先通过对应查询接口获取。创建时由服务器生成，忽略传入值。",
  name: "便于管理员识别的显示名称。",
  subscriptionKey: "用户唯一订阅密钥，用于访问订阅链接；创建时提供随机且唯一的值。属于敏感凭据。",
  subconverterId: "订阅转换器 ID；null 表示未指定。通过 subconverter.getAll 查询可用值。",
  nodeId: "所属节点 ID，通过 node.getAll 查询。",
  nodeClientId: "节点客户端 ID，通过 nodeClient.getAll 查询。",
  userId: "用户 ID，通过 user.getAll 查询。",
  userIds: "最终完整的用户 ID 集合；空数组解除该客户端全部关联。",
  type: "节点类型：custom、3x-ui 或 external-subscription；创建默认 custom。",
  host: "节点主机地址；可以为 null。",
  accessUrl: "节点管理或访问地址；可以为 null，可能包含敏感信息。",
  url: "资源 URL：客户端为代理分享链接/订阅地址，转换器为服务根地址。可能包含凭据。",
  options: "订阅转换器 URL 查询参数字符串，不带问号，例如 emoji=true&udp=true。",
  isDefault: "是否标记为默认订阅转换器；创建省略时为 false。",
  key: "Clash 配置的唯一标识，用于订阅 URL 选择配置；不同于用户 subscriptionKey。",
  globalConfig: "Clash 全局配置的 YAML 映射字符串；null 可清空配置。",
  rules: "Clash 规则的 YAML 列表字符串；合并时添加到原规则之前，null 可清空。",
  enable: "该用户是否启用此客户端；新关联默认 true。",
  order: "该用户订阅中的客户端排列顺序，数值越小越靠前。",
  data: "要局部修改的字段；省略字段保持原值，只有允许 null 的字段才能用 null 清空。",
  defaultOptions: "仅供新增关联使用的默认选项，不会覆盖现有关联。",
  configId: "Clash 配置 ID，通过 clashConfig.getAll 查询；不是配置 key。",
  baseYaml: "待合并的完整 Clash YAML 字符串。",
  createdAt: "创建时间，ISO 8601 字符串，由服务器生成。",
  updatedAt: "最近修改时间，ISO 8601 字符串，由服务器生成。",
  success: "操作执行完成标记。",
  items: "该节点下的节点客户端及用户关联。",
  users: "用户记录或客户端关联的用户列表，具体字段见元素 schema。",
  nodes: "节点记录数组。",
  nodeClients: "节点客户端记录数组。",
  userClientOptions: "用户与节点客户端的关联记录数组。",
  subconverters: "订阅转换器记录数组。",
  clashConfigs: "Clash 配置记录数组。",
};
