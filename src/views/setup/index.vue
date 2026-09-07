<template>
	<div class="tw-setup-page tw-flex tw-min-h-full tw-items-center tw-justify-center tw-bg-canvas tw-p-6">
		<div class="tw-w-full tw-max-w-md tw-rounded-xl tw-border tw-border-border tw-bg-card tw-p-8 tw-shadow-panel">
			<div class="tw-mb-6 tw-flex tw-flex-col tw-items-center tw-text-center">
				<img src="/agentscope.svg" alt="AgentScope" class="tw-mb-3 tw-h-12 tw-w-12" />
				<h1 class="tw-text-xl tw-font-semibold tw-text-foreground">AgentScope</h1>
				<p class="tw-mt-2 tw-text-sm tw-text-muted-foreground">
					输入服务器地址和你的用户名即可开始。
				</p>
			</div>

			<el-alert
				v-if="errorMessage"
				:title="errorMessage"
				type="error"
				show-icon
				:closable="false"
				class="tw-mb-4"
			/>

			<el-form label-position="top" @submit.native.prevent>
				<el-form-item label="服务器地址" required>
					<el-input
						v-model="form.serverUrl"
						placeholder="http://localhost:8000"
						clearable
						@keyup.enter.native="onSubmit"
					/>
				</el-form-item>
				<el-form-item label="用户名" required>
					<el-input
						v-model="form.userId"
						placeholder="user"
						clearable
						@keyup.enter.native="onSubmit"
					/>
				</el-form-item>
			</el-form>

			<el-button
				type="primary"
				class="tw-w-full"
				:loading="loading"
				@click="onSubmit"
			>
				开始使用
			</el-button>
		</div>
	</div>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { healthApi, ApiError, TIMEOUT_STATUS } from '@/api';

export default defineComponent({
	name: 'SetupPage',
	data() {
		return {
			form: {
				serverUrl: 'http://localhost:8000',
				userId: 'user',
			},
			loading: false,
			errorMessage: '',
		};
	},
	methods: {
		async onSubmit() {
			this.errorMessage = '';
			const serverUrl = this.form.serverUrl.trim().replace(/\/+$/, '');
			const userId = this.form.userId.trim();

			if (!serverUrl) {
				this.errorMessage = '请填写服务器地址。';
				return;
			}
			if (!userId) {
				this.errorMessage = '请填写用户名。';
				return;
			}

			this.loading = true;
			try {
				await healthApi.check(serverUrl, userId);
				this.$store.dispatch('app/saveConfig', { serverUrl, username: userId });
				this.$message.success('连接成功');
				this.$router.replace('/');
			} catch (e) {
				this.errorMessage = this.mapError(e);
			} finally {
				this.loading = false;
			}
		},
		mapError(e) {
			if (!(e instanceof ApiError)) return '连接失败，请检查服务器地址和网络。';
			switch (e.status) {
				case 0:
					return '无法连接到服务器，请检查地址是否正确、服务是否已启动。';
				case TIMEOUT_STATUS:
					return '服务器响应超时，请稍后重试。';
				case 401:
					return '鉴权失败，请检查用户名配置。';
				case 503:
					return '服务尚未就绪，请确认 AgentScope Studio 已完整启动。';
				default:
					return `服务器返回错误（${e.status}）：${e.detail || e.message}`;
			}
		},
	},
});
</script>
