# PaperPulse · 种子集 v0

> **用途**：构建你个人研究兴趣的锚点向量，供 PaperPulse 入口粗筛（Level 2 语义过滤）使用。
> **使用方法**：在 `[ ]` 里打勾 `[x]` 表示保留，留空表示删除。也可以在任意位置手动补充自己的论文。每条后面有空位可以写备注。
> **目标保留数量**：100–150 篇（你可以删到不喜欢的，也可以加上你自己读过印象深的）。
> **生成日期**：2026-04-22
> **范围分配**：CS 侧 50 · Finance 侧 50 · 交叉点 50 = 150 篇

---

## Part 1: 种子论文（150 篇）

### 🔵 Part 1A — CS 侧锚点（50 篇）

> 覆盖 agents / LLM / RL / benchmark / alignment / reasoning 六个子方向，各约 8 篇 + 2 篇方法论通用经典。

#### § Agents（多智能体 / 工具使用 / 规划）

- [ ] **ReAct: Synergizing Reasoning and Acting in Language Models** — Yao et al. (Princeton + Google), ICLR 2023. 【agent 范式奠基】
- [ ] **Toolformer: Language Models Can Teach Themselves to Use Tools** — Schick et al. (Meta AI), NeurIPS 2023. 【工具使用经典】
- [ ] **Voyager: An Open-Ended Embodied Agent with Large Language Models** — Wang et al. (NVIDIA + Caltech), TMLR 2024. 【终身学习 agent】
- [ ] **Generative Agents: Interactive Simulacra of Human Behavior** — Park et al. (Stanford + Google), UIST 2023. 【多 agent 模拟社会】
- [ ] **AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation** — Wu et al. (Microsoft), COLM 2024. 【多 agent 框架】
- [ ] **Reflexion: Language Agents with Verbal Reinforcement Learning** — Shinn et al. (Northeastern + MIT), NeurIPS 2023. 【自我反思 agent】
- [ ] **MetaGPT: Meta Programming for a Multi-Agent Collaborative Framework** — Hong et al. (DeepWisdom + CUHK), ICLR 2024. 【软件工程 agent 组】
- [ ] **SWE-Agent: Agent-Computer Interfaces Enable Automated Software Engineering** — Yang et al. (Princeton), NeurIPS 2024. 【agent-environment 接口】

#### § LLM（推理 / 长上下文 / 训练方法）

- [ ] **Chain-of-Thought Prompting Elicits Reasoning in Large Language Models** — Wei et al. (Google), NeurIPS 2022. 【CoT 奠基】
- [ ] **Tree of Thoughts: Deliberate Problem Solving with Large Language Models** — Yao et al. (Princeton + Google DeepMind), NeurIPS 2023. 【ToT】
- [ ] **Self-Consistency Improves Chain of Thought Reasoning in Language Models** — Wang et al. (Google), ICLR 2023. 【推理增强】
- [ ] **Lost in the Middle: How Language Models Use Long Contexts** — Liu et al. (Stanford + UC Berkeley), TACL 2024. 【长上下文问题揭示】
- [ ] **Direct Preference Optimization: Your Language Model is Secretly a Reward Model** — Rafailov et al. (Stanford), NeurIPS 2023. 【DPO】
- [ ] **LIMA: Less Is More for Alignment** — Zhou et al. (Meta), NeurIPS 2023. 【少量数据对齐】
- [ ] **Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks** — Lewis et al. (Meta), NeurIPS 2020. 【RAG 奠基】
- [ ] **Scaling Instruction-Finetuned Language Models (Flan)** — Chung et al. (Google), JMLR 2024. 【指令微调】

#### § RL（RLHF / offline RL / 决策）

- [ ] **Training Language Models to Follow Instructions with Human Feedback (InstructGPT)** — Ouyang et al. (OpenAI), NeurIPS 2022. 【RLHF 奠基】
- [ ] **Constitutional AI: Harmlessness from AI Feedback** — Bai et al. (Anthropic), 2022. 【RLAIF】
- [ ] **Conservative Q-Learning for Offline Reinforcement Learning** — Kumar et al. (UC Berkeley), NeurIPS 2020. 【offline RL】
- [ ] **Decision Transformer: Reinforcement Learning via Sequence Modeling** — Chen et al. (UC Berkeley + Facebook + Google), NeurIPS 2021. 【DT 范式】
- [ ] **Mastering Diverse Domains through World Models (DreamerV3)** — Hafner et al. (DeepMind), Nature 2025. 【world model】
- [ ] **Reward Hacking Behavior Can Generalize Across Tasks** — Pan et al. (UC Berkeley), NeurIPS 2024. 【对齐风险】
- [ ] **Human-Timescale Adaptation in an Open-Ended Task Space (AdA)** — DeepMind, Science 2024. 【快速适应】
- [ ] **RLHF from Scratch (OpenRLHF / Nemotron frameworks)** — NVIDIA, 2024. 【开源 RLHF pipeline】

#### § Benchmark & Evaluation

- [ ] **HELM: Holistic Evaluation of Language Models** — Liang et al. (Stanford), TMLR 2023. 【全面评测】
- [ ] **Beyond the Imitation Game (BIG-bench)** — Srivastava et al. (多机构), TMLR 2023. 【大规模 benchmark】
- [ ] **MMLU: Measuring Massive Multitask Language Understanding** — Hendrycks et al. (UC Berkeley), ICLR 2021. 【知识测试经典】
- [ ] **GPQA: A Graduate-Level Google-Proof Q&A Benchmark** — Rein et al. (NYU), COLM 2024. 【难题评测】
- [ ] **AgentBench: Evaluating LLMs as Agents** — Liu et al. (Tsinghua + BAAI), ICLR 2024. 【agent 评测】
- [ ] **τ-bench: Benchmarking Tool-Agent-User Interaction** — Yao et al. (Sierra), 2024. 【agent 用户交互评测】
- [ ] **Can LLMs Follow Simple Rules?** — Mu et al. (UC Berkeley), ICML 2024. 【安全评测】
- [ ] **LiveBench: A Challenging, Contamination-Free LLM Benchmark** — White et al. (Abacus), 2024. 【无污染评测】

#### § Alignment & Safety

- [ ] **Red Teaming Language Models to Reduce Harms** — Ganguli et al. (Anthropic), 2022. 【红队测试】
- [ ] **Discovering Language Model Behaviors with Model-Written Evaluations** — Perez et al. (Anthropic), ACL 2023. 【自动评测】
- [ ] **Sleeper Agents: Training Deceptive LLMs that Persist Through Safety Training** — Hubinger et al. (Anthropic), 2024. 【欺骗性对齐】
- [ ] **Debating with More Persuasive LLMs Leads to More Truthful Answers** — Khan et al. (Anthropic + UCL), ICML 2024. 【辩论对齐】
- [ ] **Weak-to-Strong Generalization** — Burns et al. (OpenAI), ICML 2024. 【超人监督】

#### § Reasoning & Knowledge

- [ ] **Let's Verify Step by Step (Process Reward Model)** — Lightman et al. (OpenAI), ICLR 2024. 【过程奖励】
- [ ] **OpenAI o1 System Card / Learning to Reason** — OpenAI, 2024. 【推理模型奠基公开材料】
- [ ] **DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via RL** — DeepSeek, 2025. 【开源推理模型】
- [ ] **Self-Taught Reasoner (STaR): Bootstrapping Reasoning with Reasoning** — Zelikman et al. (Stanford), NeurIPS 2022. 【自举推理】

#### § Representation Learning & Foundations

- [ ] **Attention Is All You Need** — Vaswani et al. (Google), NeurIPS 2017. 【Transformer 奠基】
- [ ] **Language Models are Few-Shot Learners (GPT-3)** — Brown et al. (OpenAI), NeurIPS 2020. 【few-shot 范式】
- [ ] **Scaling Laws for Neural Language Models** — Kaplan et al. (OpenAI), 2020. 【scaling law】
- [ ] **Training Compute-Optimal Large Language Models (Chinchilla)** — Hoffmann et al. (DeepMind), NeurIPS 2022. 【算力最优】
- [ ] **LLaMA 3 / Qwen 2.5 / DeepSeek-V3 Technical Reports** — 2024–2025. 【开源基座】
- [ ] **Mamba: Linear-Time Sequence Modeling with Selective State Spaces** — Gu & Dao (CMU + Princeton), COLM 2024. 【SSM 架构】
- [ ] **Scaling Transformers to 1M Tokens and Beyond (长上下文综述)** — 2024. 【长上下文路线】

#### § Multi-Agent & Emergent Behavior

- [ ] **Emergent Tool Use From Multi-Agent Autocurricula** — Baker et al. (OpenAI), ICLR 2020. 【多 agent 涌现】
- [ ] **Cicero: Human-Level Play in Diplomacy** — Meta, Science 2022. 【多 agent 谈判】
- [ ] **Agent Hospital: A Simulacrum of Hospital with Evolvable Medical Agents** — Li et al. (Tsinghua), 2024. 【多 agent 仿真】
- [ ] **Multi-Agent Debate Framework** — Du et al. (MIT), ICML 2024. 【多 agent 辩论】

---

### 🟢 Part 1B — Finance 侧锚点（50 篇）

> 覆盖 asset pricing / 行为金融 / 市场微观结构 / 公司金融 / 风险管理 / 计量方法，兼顾现代经典和近期前沿。

#### § Asset Pricing - Factor Models & Cross-Section

- [ ] **The Cross-Section of Expected Stock Returns** — Fama & French, JF 1992. 【因子模型经典】
- [ ] **A Five-Factor Asset Pricing Model** — Fama & French, JFE 2015. 【五因子】
- [ ] **Empirical Asset Pricing via Machine Learning** — Gu, Kelly, Xiu, RFS 2020. 【ML 资产定价里程碑】
- [ ] **Autoencoder Asset Pricing Models** — Gu, Kelly, Xiu, JE 2021. 【深度因子】
- [ ] **Deep Learning in Asset Pricing** — Chen, Pelger, Zhu, MS 2023. 【深度学习定价】
- [ ] **Factor Zoo: A Taxonomy of Risk Factors** — Harvey, Liu, Zhu, RFS 2016. 【因子动物园】
- [ ] **Shrinking the Cross-Section** — Kozak, Nagel, Santosh, JFE 2020. 【稀疏因子】
- [ ] **Missing Data in Asset Pricing Panels** — Bryzgalova et al., RFS 2024. 【缺失数据】

#### § Asset Pricing - Theory & Macro

- [ ] **The Equity Premium Puzzle** — Mehra & Prescott, JME 1985. 【股权溢价之谜】
- [ ] **By Force of Habit: A Consumption-Based Explanation of Aggregate Stock Market Behavior** — Campbell & Cochrane, JPE 1999. 【习惯形成】
- [ ] **Long-Run Risks (LRR) model** — Bansal & Yaron, JF 2004. 【长期风险】
- [ ] **Rare Disasters and Asset Markets in the Twentieth Century** — Barro, QJE 2006. 【罕见灾难】
- [ ] **Intermediary Asset Pricing: New Evidence from Many Asset Classes** — He, Kelly, Manela, JFE 2017. 【中介定价】

#### § Behavioral Finance

- [ ] **Prospect Theory: An Analysis of Decision under Risk** — Kahneman & Tversky, Econometrica 1979. 【前景理论】
- [ ] **A Model of Investor Sentiment** — Barberis, Shleifer, Vishny, JFE 1998. 【情绪模型】
- [ ] **Investor Psychology and Security Market Under- and Overreactions** — Daniel, Hirshleifer, Subrahmanyam, JF 1998. 【过度反应】
- [ ] **Noise Trader Risk in Financial Markets** — De Long, Shleifer, Summers, Waldmann, JPE 1990. 【噪音交易者】
- [ ] **Attention-Induced Trading and Returns: Evidence from Robinhood Users** — Barber et al., JF 2022. 【散户注意力】
- [ ] **Retail Trading in Options and the Rise of the Big Three Wholesalers** — Bryzgalova et al., JF 2023. 【散户期权】
- [ ] **Behavioral Finance — Handbook chapter** — Barberis, 2018. 【综述】

#### § Market Microstructure & HFT

- [ ] **Market Microstructure Theory** — O'Hara, 1995 (textbook). 【微观结构基础】
- [ ] **High-Frequency Trading and Price Discovery** — Brogaard, Hendershott, Riordan, RFS 2014. 【HFT 经典】
- [ ] **The Flash Crash: High-Frequency Trading in an Electronic Market** — Kirilenko et al., JF 2017. 【闪崩】
- [ ] **Deep Order Flow Imbalance: Extracting Alpha at Multiple Horizons from Limit Order Book** — Kolm, Turiel, Westray, QF 2023. 【LOB 深度学习】
- [ ] **A Non-Random Walk Down Wall Street** — Lo & MacKinlay, 1999 (book chapter). 【市场有效性】

#### § Corporate Finance & Governance

- [ ] **Capital Structure: Theory and Evidence (Modigliani-Miller revisited)** — Myers, JEP 1984. 【资本结构】
- [ ] **A Survey of Corporate Governance** — Shleifer & Vishny, JF 1997. 【治理综述】
- [ ] **The Financial Reporting Environment: Review of the Recent Literature** — Beyer et al., JAE 2010. 【信息披露】

#### § Risk Management & Derivatives

- [ ] **Value at Risk — measuring market risk** — Jorion (textbook). 【VaR 标准】
- [ ] **Option Pricing: A Simplified Approach (CRR Binomial)** — Cox, Ross, Rubinstein, JFE 1979. 【二叉树】
- [ ] **Stochastic Volatility Models (Heston)** — Heston, RFS 1993. 【随机波动率】
- [ ] **Deep Hedging** — Buehler, Gonon, Teichmann, Wood, QF 2019. 【深度对冲】

#### § Econometrics & Methodology

- [ ] **Double/Debiased Machine Learning for Treatment and Structural Parameters** — Chernozhukov et al., Econometrics Journal 2018. 【DML】
- [ ] **Generic Machine Learning Inference on Heterogeneous Treatment Effects** — Chernozhukov et al., 2018. 【因果 ML】
- [ ] **Synthetic Controls Method** — Abadie, JEL 2021 (review). 【合成控制】

#### § Fintech & Digital Finance

- [ ] **Fintech, Regulatory Arbitrage, and the Rise of Shadow Banks** — Buchak et al., JFE 2018. 【影子银行】
- [ ] **Machine Learning and the Stock Market** — Avramov, Cheng, Metzker, RFS 2023 评论. 【ML 实证综述】
- [ ] **Big Data in Finance** — Goldstein, Spatt, Ye, RFS 2021 special issue intro. 【大数据金融综述】
- [ ] **Decentralized Finance: Implications for Financial Services** — BIS Working Paper, 2022. 【DeFi 综述】

#### § Textual Analysis & Sentiment in Finance (pre-LLM era)

- [ ] **When Is a Liability Not a Liability? Textual Analysis, Dictionaries, and 10-Ks** — Loughran & McDonald, JF 2011. 【金融词典经典】
- [ ] **Predicting Returns with Text Data** — Ke, Kelly, Xiu, JFQA 2024. 【SESTM 文本-收益】
- [ ] **Manager Sentiment and Stock Returns** — Jiang, Lee, Martin, Zhou, JFE 2019. 【情绪指标】
- [ ] **Measuring Economic Policy Uncertainty** — Baker, Bloom, Davis, QJE 2016. 【政策不确定性】

#### § ESG & Alternative Data

- [ ] **Aggregate Confusion: The Divergence of ESG Ratings** — Berg, Kölbel, Rigobon, RoF 2022. 【ESG 分歧】
- [ ] **Machine Learning from Schools about Health Effects of Long-Term Climate** — recent 2024. 【替代数据】
- [ ] **Social Media and Financial News Manipulation** — Clarke et al., RFS 2021. 【社交媒体金融】

---

### 🟣 Part 1C — 交叉点（CS × Finance）锚点（50 篇）

> 这是你的主战场。每条会标注交叉类型。

#### § LLM for Financial Analysis & Research Automation

- [ ] **BloombergGPT: A Large Language Model for Finance** — Wu et al. (Bloomberg), 2023. 【金融 LLM 奠基】
- [ ] **FinGPT: Open-Source Financial Large Language Models** — Yang et al. (Columbia + NYU), 2023. 【开源金融 LLM】
- [ ] **PIXIU: A Comprehensive Benchmark and Instruction Dataset for Finance LLMs** — Xie et al., NeurIPS 2023 D&B. 【金融 LLM 评测】
- [ ] **FinBen: A Holistic Financial Benchmark for LLMs** — Xie et al., NeurIPS 2024. 【金融 LLM benchmark】
- [ ] **Large Language Models as Financial Analysts?** — Kim, Muhn, Nikolaev, 2024. 【LLM 分析师能力】
- [ ] **Can ChatGPT Forecast Stock Price Movements? Return Predictability and LLM Sentiment** — Lopez-Lira, Tang, 2023 working paper. 【预测力】
- [ ] **FinanceBench: A New Benchmark for Financial Question Answering** — Islam et al. (Patronus AI), 2023. 【金融 QA】
- [ ] **FinMem: LLM Agent with Layered Memory for Financial Decision-Making** — Yu et al., ICAIF 2024. 【金融 agent 记忆】

#### § Agents for Trading & Portfolio Management

- [ ] **FinGPT-Forecaster / FinRL-Agent series** — AI4Finance Foundation, 2023–2024. 【开源金融 agent】
- [ ] **TradingGPT: Multi-Agent System with Layered Memory and Distinct Characters for Stock Trading** — Li et al., 2023. 【多 agent 交易】
- [ ] **An Autonomous Agent for Portfolio Management (Ant Group)** — 2024 working paper. 【组合 agent】
- [ ] **Simulating Financial Market via Large Language Model Agents** — Gao et al. (Fudan + MSRA), 2024. 【市场仿真】
- [ ] **StockAgent: From LLM to LLM Agent Simulation for Stock Trading** — Zhang et al., 2024. 【仿真交易】
- [ ] **FinAgent: A Multimodal Foundation Agent for Financial Trading** — Zhang et al. (MSRA + HKU), KDD 2024. 【多模态金融 agent】
- [ ] **LLM-Based Autonomous Agents for Financial Forecasting** — 2024. 【自动预测】

#### § RL for Portfolio & Trading

- [ ] **Deep Reinforcement Learning for Portfolio Management** — Jiang, Xu, Liang, 2017. 【早期代表】
- [ ] **FinRL: Deep Reinforcement Learning Framework to Automate Trading in Quantitative Finance** — Liu et al., ICAIF 2021. 【框架】
- [ ] **Risk-Sensitive Reinforcement Learning for Finance** — multiple 2022–2024. 【风险感知 RL】
- [ ] **Model-Based RL for Market Making** — Spooner, Savani, et al., 2020–2023. 【做市商】
- [ ] **Adversarial RL for Order Execution** — Karpe et al. (JPM), ICAIF 2020. 【执行算法】
- [ ] **Meta-Learning for Financial Time Series** — 2023 recent. 【元学习】

#### § ML for Asset Pricing (CS × Finance 的核心交叉)

- [ ] **Deep Learning for Portfolio Optimization** — Zhang, Zohren, Roberts, JFDS 2020. 【深度组合】
- [ ] **Thirty Years of Academic Finance and ML** — Kelly & Xiu, Annual Review 2023. 【综述权威】
- [ ] **Financial Machine Learning (book excerpts)** — Nagel, 2021. 【教材】
- [ ] **Forest through the Trees: Building Cross-Sections of Stock Returns** — Bryzgalova, Pelger, Zhu, JF 2023. 【深度截面】
- [ ] **Interpretable Deep Learning in Asset Pricing** — 2024 recent. 【可解释性】

#### § LLM × Sentiment & Textual Prediction

- [ ] **FinBERT: Financial Sentiment Analysis with Pre-trained Language Models** — Huang, Wang, Yang, 2020. 【FinBERT】
- [ ] **Predicting Earnings Using ChatGPT** — Kim et al., 2024. 【LLM 预测盈余】
- [ ] **Conference Call Tone and Stock Returns** — 2023. 【电话会议语气】
- [ ] **Reading Between the Lines: Using LLMs to Measure Regulatory Tone** — 2024. 【监管文本】
- [ ] **Summarizing 10-K Filings with LLMs for Return Prediction** — 2024 working paper. 【LLM 年报总结】

#### § Agent-Based Markets & Simulation

- [ ] **Agent-Based Model of Financial Markets** — LeBaron, 2006 (classic survey). 【ABM 综述】
- [ ] **ABIDES: Agent-Based Interactive Discrete Event Simulation** — Byrd, Hybinette, Balch (JPM AI Research), ICAIF 2020. 【仿真平台】
- [ ] **LLM-Agent Based Market Simulator** — recent 2024. 【LLM+ABM】
- [ ] **Simulating Investor Behavior via LLM Agents** — 2024. 【投资者仿真】

#### § Causal Inference & Alternative Data in Finance

- [ ] **Causal Inference for Finance (review)** — Lopez de Prado, 2023. 【因果金融】
- [ ] **Satellite Imagery and Retail Sales Forecasting** — Katona et al., MS 2023. 【卫星数据】
- [ ] **Alternative Data in Investment Management** — CFA Institute, 2023. 【替代数据综述】

#### § Benchmarks & Datasets for AI × Finance

- [ ] **FLUE: Financial Language Understanding Evaluation** — Shah et al., EMNLP 2022. 【金融 NLU】
- [ ] **Open-FinLLMs: Open Multimodal Large Language Models for Financial Applications** — 2024. 【开源多模态金融】
- [ ] **FinQA / TAT-QA / ConvFinQA** — 系列数据集. 【金融推理数据集】
- [ ] **DoctorGLM / FinGLM** — 垂直领域 LLM benchmark. 【垂直评测】

#### § Interpretability & Robustness in Financial ML

- [ ] **SHAP Values for Financial Predictions** — multiple applied works. 【SHAP 金融应用】
- [ ] **Adversarial Robustness in Stock Prediction** — 2023–2024. 【对抗鲁棒】
- [ ] **Data Leakage in Financial ML** — Lopez de Prado, 2022. 【数据泄漏】

#### § LLM for Investment Research & Reports

- [ ] **GPT-Generated Equity Research: Quality and Market Impact** — 2024. 【GPT 研报】
- [ ] **LLM-Based Analyst Report Generation (Morgan Stanley / JPM internal white papers)** — 2024. 【业界白皮书】
- [ ] **Anthropic / OpenAI case studies on financial workflows** — 2024. 【应用案例】

#### § DeFi, Crypto × ML

- [ ] **Machine Learning for Cryptocurrency Prediction (survey)** — 2023. 【加密 ML 综述】
- [ ] **DeFi Risk Analytics via Graph Neural Networks** — 2024. 【图网络 DeFi】

---

### 📝 你自己补充的论文（请在此补充）

<!-- 在下面添加你自己读过觉得重要的论文，格式任意 -->

- [ ]
- [ ]
- [ ]
- [ ]
- [ ]

---

## Part 2: 主题定义（10 段英文描述，供 embedding）

> 这些是用来做**主题向量**的。每段会被 embedding 成一个向量，新论文会和它们算相似度。英文描述越精确，召回越准。中文是注释。

### Topic 1: LLM Agents for Finance
**EN**: Large language model agents applied to financial tasks including trading decisions, portfolio management, investment research automation, financial report generation, and analyst workflow support. Includes multi-agent systems, tool-using agents, memory-augmented agents, and agents that interact with market simulators or real market data.
**ZH**: LLM 金融 agent，涵盖交易决策、组合管理、研究自动化、报告生成、分析师辅助；多 agent、工具使用、记忆增强、市场交互。

### Topic 2: Reinforcement Learning for Trading and Portfolio Optimization
**EN**: Reinforcement learning methods for quantitative trading, including portfolio optimization, order execution, market making, optimal execution, risk-sensitive RL, offline RL on financial data, meta-RL for regime shifts, and adversarial RL in financial markets.
**ZH**: RL 交易与组合优化，含执行算法、做市、风险感知、offline RL、元 RL、对抗 RL。

### Topic 3: Machine Learning for Asset Pricing
**EN**: Machine learning and deep learning approaches to empirical asset pricing, cross-sectional return prediction, factor model construction, nonlinear factor discovery, autoencoders for pricing, interpretable ML for financial economics, and ML treatment of missing data in asset pricing panels.
**ZH**: ML 资产定价，含截面预测、因子构造、非线性因子、自编码、可解释性、缺失数据。

### Topic 4: NLP and Sentiment Analysis in Finance
**EN**: Natural language processing applied to financial texts including 10-K filings, earnings calls, analyst reports, news articles, social media (Twitter, Reddit, StockTwits), and regulatory documents. Covers sentiment analysis, topic modeling, BERT/LLM-based text representations, manager tone detection, and using language features to predict returns or firm outcomes.
**ZH**: 金融文本 NLP，含 10-K、电话会议、研报、新闻、社媒、监管文件；情绪、主题、LLM 表示、语气、收益预测。

### Topic 5: Agent-Based Financial Market Simulation
**EN**: Agent-based models and simulations of financial markets, including multi-agent market microstructure simulation, LLM-powered trader agents, synthetic market generators, experiments on market stability and crashes, and platforms like ABIDES. Includes using LLM agents as synthetic investors to study behavioral phenomena.
**ZH**: 基于 agent 的市场仿真，含微观结构、LLM 交易者、合成市场、稳定性实验、ABIDES 类平台、行为仿真。

### Topic 6: Foundation Models and Benchmarks for Finance
**EN**: Domain-specific pre-trained foundation models for finance (BloombergGPT, FinGPT, FinBERT, and variants), financial benchmarks for large language models (FinBen, PIXIU, FinanceBench, FLUE), instruction-tuning datasets for financial tasks, and multimodal financial models combining text, time-series, and tables.
**ZH**: 金融基座模型（BloombergGPT 系、FinBERT 系），金融 LLM benchmark（FinBen、PIXIU、FinanceBench），指令数据，多模态金融。

### Topic 7: LLM Agents General (non-finance but methodologically relevant)
**EN**: General advances in LLM agents including planning, tool use, reflection, multi-agent coordination, agent benchmarks, agent-computer interfaces, embodied agents, and memory architectures. Methods here transfer to financial agents so this topic is kept as a companion area.
**ZH**: 通用 LLM agent 方法（规划、工具、反思、多 agent、benchmark、接口、记忆），作为金融 agent 的方法论源头。

### Topic 8: Behavioral Finance and Investor Decision Making
**EN**: Behavioral finance research including prospect theory, investor sentiment models, limits to arbitrage, noise trader risk, attention-induced trading, retail investor behavior, overreaction and underreaction, disposition effect, and experimental/empirical studies of investor psychology. Especially work using modern data (trading apps, social media) or ML methods.
**ZH**: 行为金融与投资者决策，含前景理论、情绪、套利极限、注意力交易、散户行为、过/欠反应、处置效应；尤其关注用现代数据或 ML 的工作。

### Topic 9: Market Microstructure and High-Frequency Data
**EN**: Market microstructure, high-frequency trading, limit order book dynamics, deep learning on order book data, market making, price discovery, liquidity provision, flash crashes, and execution algorithms. Bridges pure finance and ML on tick data.
**ZH**: 市场微观结构与高频数据，含 LOB 深度学习、做市、价格发现、流动性、闪崩、执行。

### Topic 10: Causal Inference, Alternative Data, and Econometric ML
**EN**: Causal machine learning for finance and economics including double machine learning, synthetic controls, heterogeneous treatment effects, and causal discovery. Also alternative data for finance (satellite imagery, geolocation, credit card transactions, social media metrics) and econometric methods for high-dimensional financial data.
**ZH**: 因果 ML 与替代数据，含 DML、合成控制、HTE、因果发现；替代数据（卫星、定位、信用卡、社媒）；高维计量。

---

## Part 3: 负向词表（明确排除的主题）

> 这些关键词出现在标题/摘要里会降低相似度分数。**按重要性分层**，中度负向的词可能在交叉论文里合法出现，不应直接剔除。

### 🚫 强负向（命中即大幅降分）
- 纯 CV/图像：`image classification`, `object detection`, `image segmentation`, `medical imaging`, `autonomous driving`, `face recognition`, `ImageNet`
- 纯语音：`speech recognition`, `speech synthesis`, `ASR`, `TTS`
- 纯机器人/具身：`robotic manipulation`, `drone navigation`, `humanoid robot`
- 纯生物医药：`protein folding`, `drug discovery`, `gene expression`, `clinical trial`, `medical diagnosis` (除非 × finance)
- 纯物理/化学：`molecular dynamics`, `quantum chemistry`, `materials science`
- 纯硬件/编译：`CUDA kernel`, `chip design`, `compiler optimization`

### ⚠️ 中度负向（降分但不排除，因可能在交叉论文里合法出现）
- 纯教育/法律：`legal text classification`, `education AI` (除非讨论金融监管/金融教育)
- 纯推荐系统：`recommender system`, `click-through rate` (除非金融产品推荐)
- 纯 Web3 非金融：`NFT art`, `Web3 gaming` (DeFi 相关保留)

### 补充注释
> 实际实现时，负向词用独立权重。例如命中强负向词让相似度 × 0.3，命中中度负向 × 0.7。

---

## Part 4: 机构白名单（起点版）

> Tier B 论文作者所属机构命中这里的，自动进入 feed（即使 Level 2 相似度不够）。
> 打勾保留，留空删除，也可以补充。实际实现时每个机构会 resolve 成 ROR ID 或 OpenAlex ID。

### 🏛️ 学术 - CS / AI 侧

- [ ] **Stanford** (CS, HAI, AI Lab)
- [ ] **MIT** (CSAIL, LIDS, Sloan AI)
- [ ] **CMU** (MLD, LTI, Tepper)
- [ ] **UC Berkeley** (BAIR, Haas, CDSS)
- [ ] **Princeton** (CS, Bendheim)
- [ ] **Columbia** (CS, DSI, Business School Finance)
- [ ] **NYU** (Courant, Stern, CDS)
- [ ] **Cornell** (CS, Johnson)
- [ ] **UIUC** (CS, Gies)
- [ ] **UMich** (CSE, Ross)
- [ ] **University of Washington** (Allen School)
- [ ] **Yale** (CS, SOM)
- [ ] **Harvard** (SEAS, HBS)
- [ ] **Oxford** (Computer Science, Saïd)
- [ ] **Cambridge** (CS, Judge)
- [ ] **Imperial College London**
- [ ] **UCL** (CS, DeepMind 临近)
- [ ] **ETH Zürich**
- [ ] **EPFL**
- [ ] **NUS** (School of Computing, Business School, FinTech Lab) ← 你自己
- [ ] **NTU Singapore**
- [ ] **SMU Singapore**
- [ ] **Tsinghua** (IIIS, 经管学院)
- [ ] **Peking University** (国发院, 光华, AI)
- [ ] **Fudan** (FDU FinTech, AI)
- [ ] **SJTU** (Apex, 安泰经管)
- [ ] **ZJU** (CAD&CG, 管理学院)
- [ ] **HKU / HKUST / CUHK**
- [ ] **University of Toronto / Vector Institute**
- [ ] **Mila / McGill / Université de Montréal**
- [ ] **KAIST**

### 🏛️ 学术 - Finance 侧

- [ ] **Chicago Booth** (AQR Lab, Fama-Miller)
- [ ] **Wharton** (Finance, Rodney White Center)
- [ ] **NYU Stern** (Salomon, Volatility Institute)
- [ ] **MIT Sloan** (LFE)
- [ ] **Columbia Business School** (finance division)
- [ ] **Stanford GSB**
- [ ] **LSE** (Finance, Systemic Risk Centre)
- [ ] **INSEAD**
- [ ] **Toulouse School of Economics**
- [ ] **University of Chicago Economics**
- [ ] **Harvard HBS Finance**
- [ ] **Kellogg Finance**

### 🏢 业界 - AI 研究院

- [ ] **Google DeepMind / Google Research**
- [ ] **Meta AI / FAIR**
- [ ] **Microsoft Research (MSR) / MSRA**
- [ ] **OpenAI**
- [ ] **Anthropic**
- [ ] **NVIDIA Research**
- [ ] **Apple ML Research**
- [ ] **Amazon Science**
- [ ] **IBM Research**
- [ ] **Salesforce Research**
- [ ] **Alibaba DAMO / Tongyi Lab**
- [ ] **Tencent AI Lab**
- [ ] **ByteDance / Seed** ← 你的 partner
- [ ] **Baidu Research**
- [ ] **Huawei Noah's Ark**
- [ ] **Ant Group AI** ← 尤其关注
- [ ] **DeepSeek**
- [ ] **MiniMax** ← 你的 partner
- [ ] **Moonshot / Kimi**
- [ ] **Zhipu AI**

### 🏦 业界 - 金融机构 AI Research

- [ ] **Bloomberg AI Group** ← 尤其关注
- [ ] **JPMorgan AI Research** ← 尤其关注
- [ ] **Goldman Sachs AI / Strats**
- [ ] **Morgan Stanley AI / Data Science**
- [ ] **BlackRock AI Labs**
- [ ] **Citadel / Citadel Securities Research**
- [ ] **Two Sigma Research**
- [ ] **Jane Street Research**
- [ ] **AQR Capital Research**
- [ ] **Man Group / Man AHL**
- [ ] **Renaissance Technologies** (极少发表, 但追踪)
- [ ] **WorldQuant Research**
- [ ] **HSBC / Standard Chartered AI**
- [ ] **DBS AI / DBS Labs** (Singapore)
- [ ] **Temasek / GIC research** (Singapore)

### 🏛️ 政府 / 央行 / 监管 / 智库

- [ ] **Federal Reserve Board / FRB of NY** (research papers)
- [ ] **ECB Research**
- [ ] **Bank of England**
- [ ] **BIS (Bank for International Settlements)**
- [ ] **MAS (Monetary Authority of Singapore)** ← 本地
- [ ] **NBER** (本身就是源但也算机构)
- [ ] **IMF Research Department**
- [ ] **PBOC research / 清华五道口 / CF40**

### 📝 你自己补充的机构（请在此补充）

- [ ]
- [ ]
- [ ]

---

## Part 5: 关注的 PI / 研究者（可选，起点版）

> 这些人的新论文自动高亮。你可以在用 PaperPulse 时再陆续添加，这里给几个明显的锚点。

### AI × Finance 交叉
- [ ] **Bryan Kelly** (Yale SOM, AQR)
- [ ] **Markus Pelger** (Stanford MS&E)
- [ ] **Dacheng Xiu** (Chicago Booth)
- [ ] **Shihao Gu** (Chicago Booth)
- [ ] **Mihai Manela** (Brandeis / intermediary asset pricing)
- [ ] **Zhi Da** (Notre Dame, retail investor)
- [ ] **Terry Hendershott** (Berkeley Haas, market microstructure)
- [ ] **Svetlana Bryzgalova** (LBS)
- [ ] **Alex Chinco** (Baruch, behavioral ML)
- [ ] **Michael Wolf** (UZH, portfolio ML)

### CS Agents / LLM
- [ ] **Yao Shunyu** (Princeton → OpenAI)
- [ ] **Percy Liang** (Stanford)
- [ ] **Jason Wei** (OpenAI)
- [ ] **Noah Goodman** (Stanford)
- [ ] **Graham Neubig** (CMU)

### 中国 AI × Finance
- [ ] **邱锡鹏** (Fudan)
- [ ] **黄萱菁** (Fudan)
- [ ] **唐杰** (Tsinghua)
- [ ] **张伟楠** (SJTU, 金融 RL)

### 📝 你自己补充的研究者（请在此补充）

- [ ]
- [ ]
- [ ]

---

## 使用指南 · 给你的 3 分钟 checklist

1. **全文通读一遍**（~15 分钟），不用每篇细看，看标题和一句话说明就行
2. **大胆删**：不认识、不感兴趣、觉得太老的都删掉，剩下 100–150 篇即可
3. **大胆加**：任何你读过印象深的、正在引用的、属于你"研究基石"的论文补进去
4. **主题定义可以改**：Part 2 的 10 段英文是你的"研究兴趣雷达"，改成你自己的话更精准
5. **机构白名单可以先粗**：不确定的先勾上，后面用着用着会发现哪些机构噪音多
6. **负向词表可以试**：先用默认的，跑一周后根据"误召回"的论文反向补充

完成后把这个文件回传给我，我会根据你的最终版：
1. 抓取每篇种子论文的 abstract
2. 生成 embedding 向量
3. 算出你的"研究兴趣中心"和"兴趣协方差"
4. 用于 Step A 的粗筛脚本

---

**下一步**：你 curate 完，我写 Step A（arXiv + SSRN + NBER 增量抓取 + 三级粗筛 + entity extraction 的 Python 脚本，单文件可跑）。
