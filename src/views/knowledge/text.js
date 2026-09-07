/**
 * 知识库页私有文案。
 */
export const TEXT = {
  knowledge: {
    subtitle: '管理智能体可检索的知识库与文档。',
    list: {
      label: '知识库列表',
      createButton: '新建知识库',
      emptyTitle: '暂无知识库',
      emptyDescription: '创建知识库并上传文档，供智能体检索。',
    },
    selectHint: '选择知识库',
    selectHintDescription: '从左侧列表选择一个知识库查看详情。',
    test: { button: '检索测试' },
    config: {
      title: '配置信息',
      embeddingModel: '嵌入模型',
      dimensions: '维度',
      credential: '凭证',
      chunker: '分块器',
      counts: '统计',
      countsValue: (documents, chunks) => `${documents} 文档 · ${chunks} 分块`,
      status: '状态',
      statusValue: (ready, indexing, failed) => `就绪 ${ready} · 索引中 ${indexing} · 失败 ${failed}`,
      createdAt: '创建时间',
    },
    dialogDelete: {
      title: '删除知识库',
      description: (name) => `确定删除知识库 "${name}"？相关文档与索引将一并删除，不可恢复。`,
    },
  },
};
