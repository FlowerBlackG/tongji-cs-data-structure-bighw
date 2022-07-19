/*
 * 应用主页。
 * 2051565
 * 创建于 2022年7月18日。
 */

import { Button, Divider, message, Modal, Radio } from 'antd'
import React from 'react'
import { PainterCanvas } from '../../components/PainterCanvas'
import './AppMain.css'

type AppState = {
    threaded: 'off' | 'pre' | 'mid' | 'post'
}

export default class AppMain extends React.Component<any, AppState>
{

    state: AppState = {
        threaded: 'off' // 线索化方案。
    }

    /** 画板对象引用。 */
    private painterRef: React.RefObject<PainterCanvas>

    /**
     * 构造。
     */
    constructor(props: any) {
        super(props)

        // 首先弹出一个使用说明。
        Modal.info({
            title: '欢迎体验二叉树演示',
            okText: '好的',
            closable: true,
            maskClosable: true,
            centered: true,
            content: <div>
                作者：2051565 数据科学与大数据技术<br/>
                《数据结构课程设计》组成部分<br />
                <br />
                请认真阅读以下说明：<br/>
                1. 点击页面上的节点，可对其进行删改等操作。<br/>
                2. 若页面上的节点形状不是正圆，请刷新页面。
            </div>
        })
        
        // 准备画板引用。
        this.painterRef = React.createRef()
    }


    /**
     * React 渲染入口函数。
     */
    override render(): React.ReactNode {

        return <div className='container'>
            <div id='title'>二叉树 - 2051565 - 数据科学与大数据技术</div>

            <div className='elementContainer'>
                <PainterCanvas ref={this.painterRef} style={{
                    width: '100%',
                    height: '80%',
                    borderRadius: '12px',
                    boxShadow: '0px 4px 10px #0005'
                }} />

                <div className='funcContainer'>
                    <div style={{ color: '#fff', fontSize: '16px' }}>线索化</div>
                    <Radio.Group 
                        value={this.state.threaded} 
                        onChange={e => {
                            this.setState({threaded: e.target.value})
                            this.painterRef.current?.redrawTree(false, e.target.value)
                        }} 
                        style={{marginLeft: '12px'}} 
                        buttonStyle='solid'
                        
                    >
                        <Radio.Button value='off'>关闭</Radio.Button>
                        <Radio.Button value='pre'>先序</Radio.Button>
                        <Radio.Button value='mid'>中序</Radio.Button>
                        <Radio.Button value='pos'>后序</Radio.Button>
                    </Radio.Group>

                    <Divider type='vertical'/>

                    <Button 
                        type='primary' 
                        onClick={ () => {
                            let leafCount = this.painterRef.current?.redrawTree(true)
                            message.info('叶节点个数：' + leafCount)
                        }}
                    >统计叶节点</Button>
                    
                    <Divider type='vertical' />

                    <div style={{ color: '#fff', fontSize: '16px'}}>遍历</div>
                    <Button 
                        ghost style={{marginLeft: '12px'}} 
                        onClick={()=> this.painterRef.current?.traverse('pre')}
                    >
                        先序
                    </Button>

                    <Button 
                        ghost style={{marginLeft: '12px'}} 
                        onClick={()=> this.painterRef.current?.traverse('mid')}
                    >
                        中序
                    </Button>

                    <Button 
                        ghost style={{marginLeft: '12px'}} 
                        onClick={()=> this.painterRef.current?.traverse('pos')}
                    >
                        后序
                    </Button>

                    <Button 
                        ghost style={{marginLeft: '12px'}} 
                        onClick={()=> this.painterRef.current?.traverse('thread')}
                    >
                        线索
                    </Button>
                </div>
            </div>
        </div>
    }
}
