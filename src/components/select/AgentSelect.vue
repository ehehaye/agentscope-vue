<template>
	<el-select :value="value" :placeholder="placeholder" @change="handleChange">
		<el-option v-if="agents.length === 0" :value="null" disabled label="暂无可用助手" />
		<template v-else-if="hasShared">
			<el-option-group v-if="yours.length > 0" label="我的">
				<el-option
					v-for="agent in yours"
					:key="agent.id"
					:value="agent.id"
					:label="agent.data?.name || agent.id"
				/>
			</el-option-group>
			<el-option-group v-if="shared.length > 0" label="共享给我">
				<el-option
					v-for="agent in shared"
					:key="agent.id"
					:value="agent.id"
					:label="agent.data?.name || agent.id"
				/>
			</el-option-group>
		</template>
		<template v-else>
			<el-option
				v-for="agent in agents"
				:key="agent.id"
				:value="agent.id"
				:label="agent.data?.name || agent.id"
			/>
		</template>
	</el-select>
</template>

<script>
import { defineComponent, computed } from '@vue/composition-api';

export default defineComponent({
	name: 'AgentSelect',
	props: {
		agents: { type: Array, default: () => [] },
		value: { type: String, default: '' },
		placeholder: { type: String, default: '选择助手' },
	},
	setup(props, { emit }) {
		const hasShared = computed(() => props.agents.some((a) => !a.editable));
		const yours = computed(() => props.agents.filter((a) => a.editable));
		const shared = computed(() => props.agents.filter((a) => !a.editable));

		function handleChange(id) {
			emit('input', id);
			emit('change', id);
		}

		return { hasShared, yours, shared, handleChange };
	},
});
</script>
