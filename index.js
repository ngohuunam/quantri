import './style'
import { Component } from 'preact'
import myState from './state.js'
import defaultState from './state-default.js'

const apiVer = 3

const remote =
  process.env.NODE_ENV === 'production'
    ? 'https://nhatroconhuong.com/v' + apiVer + '/nhatro'
    : 'http://' + location.hostname + ':5000/v' + apiVer + '/nhatro'

const pw = process.env.NODE_ENV === 'production' ? '' : '123Bistqt'

export default class App extends Component {
  state = myState

  calculateMonths = year => {
    const _MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const DATE = new Date()
    const toDay = DATE.getDate()
    const monthIndex = DATE.getMonth()
    const currentYear = DATE.getFullYear()
    let currentMonth = toDay > 5 ? monthIndex : monthIndex - 1
    let MONTHS
    if (currentMonth < 1) {
      year = year - 1
      currentMonth = 12
    }
    console.log('currentMonth', currentMonth)
    if (year === 2018) MONTHS = _MONTHS.slice(8, 12)
    else if (year === currentYear) MONTHS = _MONTHS.slice(0, currentMonth)
    else MONTHS = _MONTHS
    console.log('MONTHS', MONTHS)
    this.setState({ month: currentMonth, year: year, months: MONTHS.reverse(), sthChanged: true })
  }

  componentWillMount = () => {
    const DATE = new Date()
    const YEAR = DATE.getFullYear()
    const M = DATE.getMonth()
    let y = 2019
    if (!M) y++
    const YEARS = [2018]
    while (y <= YEAR) {
      YEARS.unshift(y)
      y++
    }
    this.setState({ years: YEARS, pass: pw })
    if (M) this.calculateMonths(YEAR)
    else this.calculateMonths(YEAR - 1)
  }

  componentDidMount() {
    const token = localStorage.getItem('adminToken')
    if (token) {
      this.setState({ token: token })
      this.login()
    }
  }

  onInput = event => {
    const name = event.target.name
    const value = event.target.value
    // console.log('name', name)
    // console.log('value', value)
    switch (name) {
      case 'dien':
      case 'nuoc':
      case 'nha':
      case 'deposit':
      case 'tienthukhac':
      case 'tienchi':
      case 'addThuChiTien':
        this.setState({ [name]: Number(value) })
        break

      default:
        this.setState({ [name]: value })
    }
  }

  onYearSelect = e => this.calculateMonths(Number(e.target.value))

  onMonthSelect = e => this.setState({ month: Number(e.target.value), sthChanged: true })

  btnClick = event => {
    event.preventDefault()
    const eventName = event.target.name
    switch (eventName) {
      case 'deposit-btn':
        this.setState({ onlyDeposit: true, reg: true })
        break
      case 'close-dialog-btn':
        this.setState({ dialog: false })
        break
      case 'report-btn':
        this.setState({ report: true })
        break
      case 'show-all-btn':
        this.setState({ showAll: true })
        break
      case 'login-btn':
      case 'dialog-ok-btn':
        this.login()
        break
      case 'next-btn':
        if (this.state.roomIndex > -1 && this.state.roomIndex < this.state.datas.length - 1)
          this.setState({ roomIndex: this.state.roomIndex + 1 })
        else this.setState({ roomIndex: 0 })
        break
      case 'prev-btn':
        if (this.state.roomIndex) this.setState({ roomIndex: this.state.roomIndex - 1 })
        else this.setState({ roomIndex: this.state.datas.length - 1 })
        break
      case 'purchase-confirm-btn':
        this.sendAction(this.state.confirm)
        break
      case 'purchase-cancel-btn':
        this.setState({ confirm: '', billIndex: 0 })
        break
      case 'reg-cancel-btn':
        this.setState({ onlyDeposit: false, reg: false })
        break
      case 'reg-btn':
        this.setState({ reg: true, dien: 0, nuoc: 0 })
        break
      case 'bill-out-btn':
        this.sendActionUpdate('update', 'out')
        break
      case 'bill-out-cancel-btn':
        this.sendActionUpdate('update', 'cancel')
        break
      case 'deposited-btn':
      case 'in-btn':
        this.sendActionUpdate(eventName.slice(0, -4))
        break
      case 'update-confirm-btn':
        this.sendActionUpdate('update')
        break
      case 'update-cancel-btn':
        this.setState({ update: false, chi: '', tienchi: '', thukhac: '', tienthukhac: '', billIndex: 0 })
        break
      case 'paid-cancel-btn':
        this.sendAction('paid-cancel')
        break
      case 'open-thuchi-btn':
        this.setState({ openThuchi: true })
        break
      case 'close-thuchi-btn':
        this.setState({ openThuchi: false })
        break
      case 'thuchi-add-btn':
        this.addThuChiEvent()
        break
      case 'thuchi-save-btn':
        this.thuchiSaveToServer()
        break
    }
  }

  sendActionUpdate = (action, preout) => {
    const props = ['dien', 'nuoc', 'nha']
    const body = {}
    props.map(prop => {
      if (this.state[prop] !== '') body[prop] = this.state[prop]
    })
    const { chi, tienchi, thukhac, tienthukhac } = this.state
    if (chi || (typeof tienchi !== 'number' && tienchi !== 0)) body.chi = { khoan: chi, tien: tienchi }
    if (thukhac || (typeof tienthukhac !== 'number' && tienthukhac !== 0)) body.khac = { khoan: thukhac, tien: tienthukhac }
    if (preout) body.preout = preout
    if (action !== 'update') {
      const propsIn = ['name', 'phone', 'email', 'deposit', 'onlyDeposit']
      propsIn.map(prop => {
        if (this.state[prop]) body[prop] = this.state[prop]
      })
    }
    this.sendAction(action, body)
  }

  sendAction = (action, body, notice) => {
    const { token, year, month, billIndex, datas, roomIndex } = this.state
    body = { ...body, ...{ token: token, year: year, month: month, action: action, billStatus: billIndex ? 'inactive' : 'active' } }
    if (!body.room) body.room = datas[roomIndex].room
    console.log(body)
    this.setState({ loading: true, notice: notice || 'Đang lưu...' })
    this.fetchServer(body)
      .then(res => {
        console.log('sendAction res', res)
        this.setState({ loading: false })
        if (res.status === 200)
          res
            .json()
            .then(json => this.handleResponse(action, json))
            .catch(e => this.setState({ notice: `Có lỗi: ${e.name}: ${e.message}` }))
        else this.handleErrRes(res)
      })
      .catch(e => this.setState({ loading: false, notice: `Có lỗi: ${e.name}: ${e.message}` }))
  }

  handleResponse = (action, json) => {
    console.log('reponse', json)
    if (action === 'thuchi') {
      const clone = JSON.parse(JSON.stringify(json))
      this.setState({ thuchi: json, thuchiClone: clone, thuchiState: [], loading: false, notice: '' })
      this.setNotice('Lưu thành công', 2)
    } else {
      const dataClone = this.state.datas.slice(0)
      const billsClone = dataClone[this.state.roomIndex].bills
      if (action === 'in' || action === 'deposited') billsClone.unshift(json)
      else billsClone[this.state.billIndex] = json
      const newState = { ...this.state, ...defaultState }
      this.setState(newState)
    }
  }

  setNotice = (text, time) => {
    this.setState({ notice: text })
    setTimeout(() => this.setState({ notice: '' }), time * 1000)
  }

  thuchiSaveToServer = () => {
    const isEditingThuchi = this.state.thuchiState.some(st => st === 'edit')
    if (isEditingThuchi) this.setNotice('Lưu thay đổi trước khi lưu lên server', 2)
    else {
      const thuchiStr = JSON.stringify(this.state.thuchi)
      const thuchiCloneStr = JSON.stringify(this.state.thuchiClone)
      if (thuchiStr !== thuchiCloneStr) this.sendAction('thuchi', { thuchi: this.state.thuchiClone, room: 'chunha' })
      else this.setNotice('Không có gì thay đổi', 2)
    }
  }

  addThuChiEvent = () => {
    const _thuchiClone = this.state.thuchiClone.slice(0)
    const _thuchiState = this.state.thuchiState.slice(0)
    _thuchiClone.push({ at: 0, khoan: '', tien: '' })
    const idx = _thuchiClone.length - 1
    _thuchiState[idx] = 'edit'
    this.setState({ thuchiClone: _thuchiClone, thuchiState: _thuchiState })
  }

  handleErrRes = res => {
    switch (res.status) {
      case 405:
        this.setState({ notice: 'Sai Mật khẩu' })
        break
      case 406:
        this.setState({ datas: [], token: '', notice: 'Auth reject' })
        localStorage.removeItem('adminToken')
        break
      default:
        this.setState({ notice: 'Dữ liệu lỗi' })
    }
  }

  handleLoginResponse = json => {
    console.log(json)
    localStorage.setItem('adminToken', json.token)
    // const LEN = process.env.NODE_ENV === 'production' ? 18 : 18
    const LEN = 18
    const thuchi = json.datas[19].bills.length ? json.datas[19].bills[0].datas : []
    const thuchiClone = thuchi.length ? JSON.parse(JSON.stringify(thuchi)) : []
    this.setState({
      datas: json.datas.slice(0, LEN),
      token: json.token,
      notice: '',
      sthChanged: false,
      thuchi: thuchi,
      thuchiClone: thuchiClone,
      dialog: false,
    })
  }

  fetchServer = (body, isLogin) => {
    const address = `${remote}/chunha${isLogin ? '' : '/action'}`
    return fetch(address, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  login = () => {
    if (this.state.sthChanged) {
      const { pass, token, month, year } = this.state
      const body = { room: '123', pass: pass, token: token, month: month, year: year }
      console.log('login body', body)
      this.setState({ loading: true, notice: this.state.token ? 'Đang tải dữ liệu...' : 'Đang đăng nhập...' })
      this.fetchServer(body, true)
        .then(res => {
          this.setState({ loading: false, sv: res.headers.get('Content-Language') })
          if (res.status === 200)
            res
              .json()
              .then(json => this.handleLoginResponse(json))
              .catch(e => this.setState({ notice: `Có lỗi: ${e.name}: ${e.message}` }))
          else this.handleErrRes(res)
        })
        .catch(e => this.setState({ loading: false, notice: `Có lỗi: ${e.name}: ${e.message}` }))
    } else this.setState({ dialog: false })
  }

  renderSelect = (label, name, fx) => {
    const array = name + 's'
    return (
      <div>
        <label for={name}>{label.toUpperCase()}</label>
        <div>
          <select name={name} value={this.state[name]} onChange={this[fx]}>
            <option value="" disabled>
              Chọn {name}
            </option>
            {this.state[array].map((el, i) => {
              return (
                <option key={i} value={el}>
                  {el}
                </option>
              )
            })}
          </select>
        </div>
      </div>
    )
  }

  renderOtherFee = fee => {
    if (fee && fee.tien)
      return (
        <div class="total">
          <div>{fee.khoan.toUpperCase()}</div>
          <div>{fee.tien.toLocaleString('vi')} đ</div>
        </div>
      )
  }

  renderBill = bill => {
    if (!bill) return <h1>PHÒNG TRỐNG</h1>
    else if (bill.deposit || bill.tongcong) {
      return (
        <div class="bill">
          <div class="table">
            <div class="bold border-bottom">
              <div>ĐIỆN - {bill.dien.gia.toLocaleString('vi')} đ/số</div>
            </div>
            <div class="border-bottom">
              <div>Số kỳ này</div>
              <div>{bill.dien.sokynay.toLocaleString('vi')}</div>
            </div>
            <div class="border-bottom">
              <div>Số kỳ trước</div>
              <div>{bill.dien.sokytruoc.toLocaleString('vi')}</div>
            </div>
            <div>
              <div>Tiêu thụ</div>
              <div>{bill.dien.tieuthu.toLocaleString('vi')} số</div>
            </div>
            <div class="total">
              <div>TIỀN ĐIỆN</div>
              <div>{bill.dien.thanhtien.toLocaleString('vi')} đ</div>
            </div>
            <div class="bold border-bottom">
              <div>NƯỚC - {bill.nuoc.gia.toLocaleString('vi')} đ/số</div>
            </div>
            <div class="border-bottom">
              <div>Số kỳ này</div>
              <div>{bill.nuoc.sokynay.toLocaleString('vi')}</div>
            </div>
            <div class="border-bottom">
              <div>Số kỳ trước</div>
              <div>{bill.nuoc.sokytruoc.toLocaleString('vi')}</div>
            </div>
            <div>
              <div>Tiêu thụ</div>
              <div>{bill.nuoc.tieuthu.toLocaleString('vi')} số</div>
            </div>
            <div class="total">
              <div>TIỀN NƯỚC</div>
              <div>{bill.nuoc.thanhtien.toLocaleString('vi')} đ</div>
            </div>
            {this.renderOtherFee({ khoan: 'CỌC', tien: bill.deposit })}
            {this.renderOtherFee(bill.khac)}
            {this.renderOtherFee(bill.chi, true)}
            <div class="total">
              <div>TIỀN RÁC</div>
              <div>{bill.rac.toLocaleString('vi')} đ</div>
            </div>
            <div class="total">
              <div>TIỀN NHÀ</div>
              <div>{bill.nha.toLocaleString('vi')} đ</div>
            </div>
            <div>
              <div class="flex space-between bold grandTotal">
                <div>T.CỘNG: </div>
                <div>{bill.tongcong.toLocaleString('vi')} đ</div>
              </div>
            </div>
          </div>
        </div>
      )
    } else return <h1>CHƯA CÓ DỮ LIỆU!!</h1>
  }

  renderConfirm = d => {
    const tongcong = d.bills[this.state.billIndex].tongcong
    const thuchiString = tongcong > 0 ? 'thu' : 'chi'
    const mess = `Xác nhận ${thuchiString} tiền phòng ${d.room} tháng ${d.month}/${d.year} số tiền ${tongcong.toLocaleString('vi')}`
    return (
      <div class="app">
        <h2>{mess}</h2>
        {this.renderButtons(['purchase-confirm', 'purchase-cancel'], 'large', ['OK', 'HỦY'])}
      </div>
    )
  }

  renderButton = (name, className, text, action, isDisabled) => {
    if (className === 'hidden') return
    const onClickAction = action || this.btnClick
    return (
      <button name={name + '-btn'} class={className} onClick={onClickAction} disabled={isDisabled}>
        {text}
      </button>
    )
  }

  renderButtons = (names, classNames, texts, actions, isDisableds) => {
    return names.map((name, idx) => {
      const action = actions && actions.length ? actions[idx] : actions
      const isDisabled = isDisableds && isDisableds.length ? isDisableds[idx] : false
      const btnClass = classNames && Array.isArray(classNames) && classNames.length ? classNames[idx] : classNames
      const text = texts[idx]
      return this.renderButton(name, btnClass, text, action, isDisabled)
    })
  }

  renderRoomButton = (bill, idx, prev, next) => {
    const btnName = bill.out ? 'out' : 'purchase'
    const mainBtnStatus = this.buttonStatus(bill)
    const btnClass = mainBtnStatus.className
    const isDisabled = mainBtnStatus.disabled
    const btnText = mainBtnStatus.label
    console.log('bill', bill)
    console.log('idx', idx)
    const regBtnClass = !bill || (bill && bill.onlyDeposit) || (bill && bill.out && bill.thanhtoan) ? '' : 'hidden'
    console.log('regBtnClass', regBtnClass)
    const depositBtnClass = !bill || (bill && bill.out && bill.thanhtoan && !bill.deposit) ? '' : 'hidden'
    const updateBtnClass = bill ? '' : 'hidden'
    const updateBtnAction = () =>
      this.setState({
        update: true,
        dien: bill.dien.sokynay || bill.dien.sokytruoc,
        nuoc: bill.nuoc.sokynay || bill.nuoc.sokytruoc,
        nha: '',
        chi: bill.chi.khoan,
        tienchi: bill.chi.tien,
        thukhac: bill.khac.khoan,
        tienthukhac: bill.khac.tien,
        billIndex: idx,
      })
    const purchaseBtnAction = () => this.setState({ confirm: btnName, billIndex: idx })
    // console.log('prev', prev)
    // console.log('next', next)
    return (
      <div>
        {this.renderBill(bill)}
        <div class="btnGroup">
          {this.renderButtons(
            ['prev', btnName, 'next'],
            ['', btnClass, ''],
            [prev.room, btnText, next.room],
            ['', purchaseBtnAction, ''],
            [false, isDisabled, false],
          )}
        </div>
        {this.renderButtons(
          ['show-all', 'reg', 'deposit', 'update'],
          ['', regBtnClass, depositBtnClass, updateBtnClass],
          ['DANH SÁCH PHÒNG', 'NHẬN PHÒNG', 'ĐẶT CỌC', 'CẬP NHẬT'],
          ['', '', '', updateBtnAction],
        )}
      </div>
    )
  }

  renderBills = (bills, prev, next) => {
    if (bills.length) return <div>{bills.map((bill, idx) => this.renderRoomButton(bill, idx, prev, next))}</div>
    else return <div>{this.renderRoomButton(false, null, prev, next)}</div>
  }

  renderRoom = datas => {
    const index = this.state.roomIndex
    const lastIndex = datas.length - 1
    const d = datas[index]
    if (this.state.confirm) return this.renderConfirm(d)
    else {
      let prev, next
      if (index && index < lastIndex) {
        prev = datas[index - 1]
        next = datas[index + 1]
      } else if (index === 0) {
        prev = datas[lastIndex]
        next = datas[1]
      } else if (index === lastIndex) {
        prev = datas[index - 1]
        next = datas[0]
      }
      // console.log('prev', prev)
      // console.log('next', next)
      return (
        <div class="app">
          <h2>{`${d.room} - ${d.month}/${d.year}`}</h2>
          {this.renderBills(d.bills, prev, next)}
        </div>
      )
    }
  }

  buttonStatus = bill => {
    return {
      label:
        bill.deposit || bill.tongcong
          ? bill.thanhtoan
            ? `ĐÃ THU${bill.out ? ' (TRỐNG)' : ''}`
            : bill.out
            ? 'BẤM ĐỂ THU VÀ TRẢ PHÒNG'
            : 'BẤM ĐỂ THU'
          : 'CHƯA CÓ DỮ LIỆU',
      className: bill.tongcong ? (bill.thanhtoan ? (bill.out ? 'out' : 'done') : '') : 'invalid',
      valid: bill.deposit || bill.tongcong,
      disabled: !bill.tongcong || (bill.tongcong && bill.thanhtoan),
    }
  }

  calculateTotalAmount = () => {
    const amount = { in: 0, out: 0, inTotal: 0, outTotal: 0 }
    this.state.datas.map(data => {
      data.bills.map(bill => {
        if (bill.thanhtoan) {
          if (bill.out) amount.out += bill.tongcong
          else amount.in += bill.tongcong
        }
        if (bill.out) amount.outTotal += bill.tongcong
        else amount.inTotal += bill.tongcong
      })
    })
    amount.inLeft = amount.inTotal - amount.in
    amount.outLeft = amount.outTotal - amount.out
    amount.grandTotal = amount.inTotal + amount.outTotal
    amount.current = amount.in + amount.out
    amount.totalLeft = amount.grandTotal - amount.current
    return amount
  }

  renderRoomGeneralInfo = (room, bills) => {
    const infos = bills.map(bill => `\n${bill.tongcong ? bill.tongcong.toLocaleString('vi') : ''}`)
    const text = room + '\n\r' + infos.join('')
    return text
  }

  goToEditThuChi = idx => e => {
    e.preventDefault()
    let clone = this.state.thuchiState.slice(0)
    clone[idx] = 'edit'
    this.setState({ thuchiState: clone })
  }

  editThuChi = (idx, isNumber, isAdd) => e => {
    const len = this.state.thuchiClone.length
    idx = isAdd ? len - 1 : idx
    const clone = this.state.thuchiClone.slice(0)
    clone[idx].at = Date.now()
    if (isNumber) clone[idx].tien = Number(e.target.value)
    else clone[idx].khoan = e.target.value
    this.setState({ thuchiClone: clone })
  }

  editingThuChiFunc = (idx, isOk) => e => {
    e.preventDefault()
    let _thuchiClone = this.state.thuchiClone.slice(0)
    let _thuchiState = this.state.thuchiState.slice(0)
    if (!this.state.thuchiClone[idx].khoan && !this.state.thuchiClone[idx].tien) {
      _thuchiClone.splice(idx, 1)
      _thuchiState.splice(idx, 1)
    } else if (isOk) _thuchiState[idx] = 'ok'
    else if (this.state.thuchi[idx]) {
      const isChanged = _thuchiClone[idx].khoan !== this.state.thuchi[idx].khoan || _thuchiClone[idx].tien !== this.state.thuchi[idx].tien
      _thuchiState[idx] = null
      if (isChanged) {
        const _thuchi = JSON.parse(JSON.stringify(this.state.thuchi))
        _thuchiClone[idx] = _thuchi[idx]
      }
    } else _thuchiClone.splice(idx, 1)
    this.setState({ thuchiClone: _thuchiClone, thuchiState: _thuchiState })
  }

  renderEditThuChi = idx => {
    const khoan = this.state.thuchiClone[idx].khoan
    const tien = this.state.thuchiClone[idx].tien

    const thuchiSwitch = () => {
      const _thuchiClone = this.state.thuchiClone.slice(0)
      _thuchiClone[idx].tien = 0 - tien
      this.setState({ thuchiClone: _thuchiClone })
    }

    const delThuchi = () => {
      const newThuchiClone = this.state.thuchiClone.filter((tc, i) => i !== idx)
      const newThuchiState = this.state.thuchiState.filter((tc, i) => i !== idx)
      this.setState({ thuchiClone: newThuchiClone, thuchiState: newThuchiState })
    }

    return (
      <div class="row edit">
        <div>
          <input class="small" type="text" value={khoan} onChange={this.editThuChi(idx)} placeholder="Khoản" autoFocus />
        </div>
        <div>
          <input class="small text-align-right" type="number" value={tien} onChange={this.editThuChi(idx, true)} placeholder="Tiền" />
        </div>
        <div>
          <div class="onoffswitch">
            <input
              onChange={thuchiSwitch}
              type="checkbox"
              name="onoffswitch"
              class="onoffswitch-checkbox"
              id="myonoffswitch"
              checked={tien < 0}
            />
            <label class="onoffswitch-label" for="myonoffswitch">
              <span class="onoffswitch-inner" />
              <span class="onoffswitch-switch" />
            </label>
          </div>
          {this.renderButtons(
            ['thuchi-edit-del', 'thuchi-edit-cancel', 'thuchi-edit-ok'],
            'small',
            ['Xóa', 'Cancel', 'OK'],
            [delThuchi, this.editingThuChiFunc(idx, false), this.editingThuChiFunc(idx, true)],
          )}
        </div>
      </div>
    )
  }

  renderThuChiRowElement = (khoan, tien, idx) => {
    return (
      <div class="row">
        <div>{khoan}</div>
        <div>{tien.toLocaleString('vi')}</div>
        <div>{this.renderButton('goto-edit-thuchi', 'small', `Sửa`, this.goToEditThuChi(idx))}</div>
      </div>
    )
  }

  totalAmountThuchi = () => {
    let total = 0
    this.state.thuchiClone.map(tc => {
      if (typeof tc.tien === 'number') total += tc.tien
    })
    return (
      <div class="general-income">
        <div class="no-border">
          <h3>Tổng cộng: </h3>
          <h3>{total.toLocaleString('vi')}</h3>
        </div>
      </div>
    )
  }

  renderThuChiPage = () => {
    return (
      <div class="app">
        <h3 class="mar-bot-8px">
          Thu chi tháng {this.state.month} - {this.state.year}
        </h3>
        <div class="thuchi">
          {this.state.thuchiClone.map((d, idx) => {
            if (this.state.openThuchi || this.state.thuchiState[idx]) {
              if (this.state.thuchiState[idx] === 'edit') return this.renderEditThuChi(idx)
              else if (this.state.openThuchi || this.state.thuchiState[idx] === 'ok')
                return this.renderThuChiRowElement(d.khoan, d.tien, idx)
            }
            const khoan = this.state.thuchi[idx].khoan
            const tien = this.state.thuchi[idx].tien
            return this.renderThuChiRowElement(khoan, tien, idx)
          })}
        </div>
        {this.totalAmountThuchi()}
        {this.renderButtons(['thuchi-add', 'thuchi-save', 'close-thuchi'], '', ['THÊM THU CHI', 'LƯU LÊN MÁY CHỦ', `QUAY LẠI`])}
      </div>
    )
  }

  renderListRoomsTable = () => {
    const labels = [
      'Phải thu',
      'Đã thu',
      'Còn phải thu',
      'Phải chi',
      'Đã chi',
      'Còn phải chi',
      'TC phải thu',
      'TC đã thu',
      'TC còn phải thu',
    ]
    const value = ['inTotal', 'in', 'inLeft', 'outTotal', 'out', 'outLeft', 'grandTotal', 'current', 'totalLeft']
    return (
      <div class="general-income">
        {labels.map((label, idx) => {
          return (
            <div>
              <h3>{label}</h3>
              <h3>{this.calculateTotalAmount()[value[idx]].toLocaleString('vi')}</h3>
            </div>
          )
        })}
      </div>
    )
  }

  renderListRooms = datas => {
    return (
      <div class="app">
        <button class="header mar-bot-8px" onClick={() => this.setState({ dialog: true })}>
          <h3>
            Danh sách phòng
            <br />
            Tháng {this.state.month} - {this.state.year}
          </h3>
        </button>
        <div class="list">
          {datas.map((data, idx) => {
            const action = () => this.setState({ roomIndex: idx, showAll: false })
            if (data.bills.length) {
              const text = this.renderRoomGeneralInfo(data.room, data.bills)
              const className = this.buttonStatus(data.bills[0]).className
              return this.renderButton(idx, className, text, action)
            } else if (!data.filled && data.deposit) {
              const text = `${data.room}\n\rCọc: ${data.deposit.tien.toLocaleString('vi')}`
              return this.renderButton(idx, 'deposited', text, action)
            } else return this.renderButton(idx, 'empty', `${data.room}`, action)
          })}
        </div>
        {this.renderListRoomsTable()}
        {this.renderButtons(['open-thuchi', 'report'], '', ['THU - CHI', `TỔNG HỢP THÁNG ${this.state.month} - ${this.state.year}`])}
      </div>
    )
  }

  renderSelectMonthYear = () => {
    return (
      <div class="app">
        <div class="flex col">
          <h1> Chọn Tháng / Năm </h1>
          {this.renderSelect('Năm', 'year', 'onYearSelect')}
          {this.renderSelect('Tháng', 'month', 'onMonthSelect')}
        </div>
        {this.renderButtons(['dialog-ok', 'close-dialog'], 'large', ['OK', 'HỦY'])}
      </div>
    )
  }

  renderLoading = () => {
    return (
      <div>
        <div className={this.state.notice ? 'notice' : 'hidden'}>{this.state.notice}</div>
        <div className={this.state.loading ? 'spinner' : 'hidden'} style="width: 100%;">
          <div class="bounce1" />
          <div class="bounce2" />
          <div class="bounce3" />
        </div>
      </div>
    )
  }

  renderInput = (label, type, name, placeholder) => {
    return (
      <div class="flex align-items-end">
        <label for={name}>{label.toUpperCase()}</label>
        <div>
          <input type={type} name={name} value={this.state[name]} placeholder={placeholder ? placeholder : label} onInput={this.onInput} />
        </div>
      </div>
    )
  }

  renderInputs = (labels, types, names, placeholders) => {
    return names.map((name, idx) => {
      return (
        <div class="flex align-items-end">
          <label for={name}>{labels[idx].toUpperCase()}</label>
          <div>
            <input
              type={types[idx]}
              name={name}
              value={this.state[name]}
              placeholder={placeholders[idx] || labels[idx]}
              onInput={this.onInput}
            />
          </div>
        </div>
      )
    })
  }

  validateRegistration = onlyUpdate => {
    let valid = this.state.dien && this.state.nuoc
    if (valid) {
      const dienkytruoc = this.state.datas[this.state.roomIndex].dien || 0
      valid = this.state.dien - dienkytruoc > -1
      const nuockytruoc = this.state.datas[this.state.roomIndex].nuoc || 0
      valid = this.state.nuoc - nuockytruoc > -1
    }
    if (!onlyUpdate) {
      valid = this.state.email && this.state.email.length > 1
      if (valid) {
        const re = /^[a-z0-9][a-z0-9-_\.]+@([a-z]|[a-z0-9]?[a-z0-9-]+[a-z0-9])\.[a-z0-9]{2,10}(?:\.[a-z]{2,10})?$/
        valid = re.test(this.state.email.toLowerCase())
      }
      valid = this.state.phone && this.state.phone.length > 9
      valid = this.state.deposit && this.state.deposit > 99999
    }
    return valid
  }

  renderInputThuChiKhac = () => {
    return this.renderInputs(
      ['Thu khác', 'Tiền thu', 'Khoản chi', 'Tiền chi'],
      ['text', 'number', 'text', 'number'],
      ['thukhac', 'tienthukhac', 'chi', 'tienchi'],
      ['Khoản thu', 'Tiền thu', 'Khoản chi', 'Tiền chi'],
    )
  }

  renderBillUpdate = (roomIdx, billIdx) => {
    const billOutBtnInfo = this.state.datas[roomIdx].bills[billIdx].out
      ? { name: 'bill-out-cancel', text: 'HUỶ TRẢ PHÒNG' }
      : { name: 'bill-out', text: 'TRẢ PHÒNG' }
    const paidCancelBtnClass = this.state.datas[roomIdx].bills[billIdx].thanhtoan ? '' : 'hidden'
    return (
      <div class="app">
        <h1> Cập Nhật </h1>
        <div class="flex col">
          {this.renderInputs(
            ['Điện', 'Nước', 'Nhà'],
            ['number', 'number', 'number'],
            ['dien', 'nuoc', 'nha'],
            ['Số điện', 'Số nước', `Tiền nhà`],
          )}
          {this.renderInputThuChiKhac()}
        </div>
        {this.renderButtons(
          ['update-confirm', 'paid-cancel', billOutBtnInfo.name, 'update-cancel'],
          ['', paidCancelBtnClass, '', ''],
          ['CẬP NHẬT', 'HỦY THANH TOÁN', billOutBtnInfo.text, 'QUAY LẠI'],
        )}
      </div>
    )
  }

  renderRegistrationInputGroup = () => {
    if (this.state.onlyDeposit)
      return (
        <div class="flex col">
          {this.renderInputs(
            ['Tên', 'ĐTDĐ', 'Email', 'Cọc'],
            ['text', 'number', 'email', 'number'],
            ['name', 'phone', 'email', 'deposit'],
            [],
          )}
        </div>
      )
    else
      return (
        <div class="flex col">
          {this.renderInputs(
            ['Tên', 'ĐTDĐ', 'Email', 'Điện', 'Nước', 'Cọc'],
            ['text', 'number', 'email', 'number', 'number', 'number'],
            ['name', 'phone', 'email', 'dien', 'nuoc', 'deposit'],
            ['', '', '', 'Số điện', 'Số nước'],
          )}
          {this.renderInputThuChiKhac()}
        </div>
      )
  }

  renderRegistration = () => {
    const mainBtnText = this.state.onlyDeposit ? 'NHẬN CỌC' : 'NHẬN PHÒNG'
    const mainBtnName = this.state.onlyDeposit ? 'deposited' : 'in'
    return (
      <div class="app">
        <h2 class="mar-bot-8px"> Điền thông tin </h2>
        {this.renderRegistrationInputGroup()}
        {this.renderButtons([mainBtnName, 'reg-cancel'], '', [mainBtnText, 'QUAY LẠI'])}
      </div>
    )
  }

  renderLogin = () => {
    const isDisabled = !this.state.pass || this.state.loading
    return (
      <div class="app">
        <h1> Hello! </h1>
        <div class="flex col">
          {this.renderInput('M.khẩu', 'password', 'pass', 'Mật khẩu')}
          {this.renderSelect('Năm', 'year', 'onYearSelect')}
          {this.renderSelect('Tháng', 'month', 'onMonthSelect')}
        </div>
        {this.renderButton('login', '', 'ĐĂNG NHẬP', '', isDisabled)}
      </div>
    )
  }

  calculateGrandTotal = datas => {
    const grandTotal = {
      tiennha: 0,
      phaithu: 0,
      dientieuthu: 0,
      tiendien: 0,
      nuoctieuthu: 0,
      tiennuoc: 0,
      rac: 0,
      khac: 0,
      chi: 0,
      coc: 0,
    }
    datas.map(data => {
      data.bills.map(bill => {
        grandTotal.phaithu += bill.tongcong
        grandTotal.tiendien += bill.dien.thanhtien
        grandTotal.tiennuoc += bill.nuoc.thanhtien
        grandTotal.nuoctieuthu += bill.nuoc.tieuthu
        grandTotal.dientieuthu += bill.dien.tieuthu
        grandTotal.tiennha += bill.nha
        grandTotal.rac += bill.rac
        grandTotal.khac += bill.khac.tien
        grandTotal.chi += bill.chi && bill.chi.tien ? bill.chi.tien : 0
        grandTotal.coc += bill.deposit ? bill.deposit : 0
      })
    })
    return grandTotal
  }

  calculateTongThuchi = () => {
    let total = 0
    this.state.thuchi.map(tc => (total += tc.tien))
    return total
  }

  renderThuchiReport = datas => {
    return (
      <table class="tg small">
        <tr class="text-center bold header">
          <td colspan="2" onClick={() => this.setState({ dialog: true })}>
            <h4>
              THU CHI THÁNG {this.state.month} - {this.state.year}
            </h4>
          </td>
        </tr>
        <tr class="bold">
          <td class="pad-right-8px">KHOẢN</td>
          <td class="right pad-left-8px">TIỀN</td>
        </tr>
        {this.state.thuchi.map((tc, i) => {
          return (
            <tr key={i} className={i % 2 === 0 ? 'even' : ''}>
              <td class="pad-right-8px">{tc.khoan}</td>
              <td class="right bold pad-left-8px">{tc.tien.toLocaleString('vi')}</td>
            </tr>
          )
        })}
        <tr class="bold header">
          <td class="pad-right-8px">TỔNG CỘNG THU CHI</td>
          <td class="right pad-left-8px">{this.calculateTongThuchi().toLocaleString('vi')}</td>
        </tr>
        <tr class="bold header">
          <td class="pad-right-8px">TỔNG CỘNG SAU CÙNG</td>
          <td class="right pad-left-8px">{(this.calculateTongThuchi() + this.calculateGrandTotal(datas).phaithu).toLocaleString('vi')}</td>
        </tr>
      </table>
    )
  }

  rederReportPage = datas => {
    return (
      <div>
        {this.renderTiennhaReport(datas)}
        <div class="page-break" />
        {this.renderThuchiReport(datas)}
      </div>
    )
  }

  renderTiennhaReport = datas => {
    const flaternBills = []
    datas.map(data => data.bills.map(bill => flaternBills.push(bill)))
    return (
      <table class="tg">
        <tr class="text-center bold header">
          <td class="only-print" colspan="20">
            <h4>
              TIỀN NHÀ THÁNG {this.state.month} - {this.state.year}
            </h4>
          </td>
          <td class="no-print" colspan="16" onClick={() => this.setState({ dialog: true })}>
            <h4>
              TIỀN NHÀ THÁNG {this.state.month} - {this.state.year}
            </h4>
          </td>
          <td colspan="2" class="no-print" onClick={() => window.print()}>
            <h4>In</h4>
          </td>
          <td colspan="2" class="no-print" onClick={() => this.setState({ report: false })}>
            <h4>Quay lại</h4>
          </td>
        </tr>
        <tr class="bold">
          <td rowspan="3">PHÒNG</td>
          <td rowspan="3">TIỀN NHÀ</td>
          <td colspan="5">ĐIỆN</td>
          <td colspan="5">NƯỚC</td>
          <td rowspan="3">RÁC</td>
          <td colspan="5">KHÁC</td>
          <td rowspan="3">CỘNG</td>
          <td rowspan="3">XÁC NHẬN</td>
        </tr>
        <tr class="bold">
          <td rowspan="2">Kỳ trước</td>
          <td rowspan="2">Kỳ này</td>
          <td rowspan="2">Tiêu thụ</td>
          <td rowspan="2">Giá</td>
          <td rowspan="2">Thành tiền</td>
          <td rowspan="2">Kỳ trước</td>
          <td rowspan="2">Kỳ này</td>
          <td rowspan="2">Tiêu thụ</td>
          <td rowspan="2">Giá</td>
          <td rowspan="2">Thành tiền</td>
          <td colspan="2">Chi</td>
          <td colspan="2">Thu</td>
          <td rowspan="2">Cọc</td>
        </tr>
        <tr class="bold">
          <td>Khoản</td>
          <td>Tiền</td>
          <td>Khoản</td>
          <td>Tiền</td>
        </tr>
        {flaternBills.map((d, i) => {
          return (
            <tr key={i} className={i % 2 === 0 ? 'even' : ''}>
              <td>{d.room}</td>
              <td class="right bold">{d.nha.toLocaleString('vi')}</td>
              <td>{d.dien.sokytruoc.toLocaleString('vi')}</td>
              <td>{d.dien.sokynay.toLocaleString('vi')}</td>
              <td>{d.dien.tieuthu.toLocaleString('vi')}</td>
              <td>{d.dien.gia.toLocaleString('vi')}</td>
              <td class="right bold">{d.dien.thanhtien.toLocaleString('vi')}</td>
              <td>{d.nuoc.sokytruoc.toLocaleString('vi')}</td>
              <td>{d.nuoc.sokynay.toLocaleString('vi')}</td>
              <td>{d.nuoc.tieuthu.toLocaleString('vi')}</td>
              <td>{d.nuoc.gia.toLocaleString('vi')}</td>
              <td class="right bold">{d.nuoc.thanhtien.toLocaleString('vi')}</td>
              <td class="right bold">{d.rac.toLocaleString('vi')}</td>
              <td class="right bold">{d.chi && d.chi.khoan ? d.chi.khoan : ''}</td>
              <td class="right bold">{d.chi && d.chi.tien ? d.chi.tien.toLocaleString('vi') : 0}</td>
              <td class="right bold">{d.khac.khoan ? d.khac.khoan : ''}</td>
              <td class="right bold">{d.khac.tien ? d.khac.tien.toLocaleString('vi') : 0}</td>
              <td class="right bold">{d.deposit ? d.deposit.toLocaleString('vi') : 0}</td>
              <td class="right bold">{d.tongcong.toLocaleString('vi')}</td>
              <td />
            </tr>
          )
        })}
        <tr class="bold header">
          <td colspan="2">
            <h4>{this.calculateGrandTotal(datas).tiennha.toLocaleString('vi')}</h4>
          </td>
          <td colspan="2" />
          <td>
            <h4>{this.calculateGrandTotal(datas).dientieuthu.toLocaleString('vi')}</h4>
          </td>
          <td colspan="2">
            <h4>{this.calculateGrandTotal(datas).tiendien.toLocaleString('vi')}</h4>
          </td>
          <td colspan="2" />
          <td>
            <h4>{this.calculateGrandTotal(datas).nuoctieuthu.toLocaleString('vi')}</h4>
          </td>
          <td colspan="2">
            <h4>{this.calculateGrandTotal(datas).tiennuoc.toLocaleString('vi')}</h4>
          </td>
          <td>
            <h4>{this.calculateGrandTotal(datas).rac.toLocaleString('vi')}</h4>
          </td>
          <td colspan="2">
            <h4>{this.calculateGrandTotal(datas).chi.toLocaleString('vi')}</h4>
          </td>
          <td colspan="2">
            <h4>{this.calculateGrandTotal(datas).khac.toLocaleString('vi')}</h4>
          </td>
          <td>
            <h4>{this.calculateGrandTotal(datas).coc.toLocaleString('vi')}</h4>
          </td>
          <td>
            <h4>{this.calculateGrandTotal(datas).phaithu.toLocaleString('vi')}</h4>
          </td>
          <td onClick={() => this.setState({ report: false })}>
            <h4 class="no-print">{'<<<'}</h4>
          </td>
        </tr>
      </table>
    )
  }

  renderPage = (token, showAll, dialog, datas, report, reg, update, roomIndex, billIndex, openThuchi) => {
    if (typeof window !== 'undefined') window.scroll(0, 0)
    if (token) {
      if (dialog) return this.renderSelectMonthYear()
      else if (report) return this.rederReportPage(datas)
      else if (openThuchi) return this.renderThuChiPage()
      else {
        if (datas.length) {
          if (showAll) return this.renderListRooms(datas)
          else if (reg) return this.renderRegistration()
          else if (update) return this.renderBillUpdate(roomIndex, billIndex)
          else return this.renderRoom(datas)
        }
      }
    } else return this.renderLogin()
  }

  render({}, { token, showAll, dialog, datas, report, reg, ver, sv, update, roomIndex, billIndex, openThuchi }) {
    return (
      <div>
        {this.renderLoading()}
        {this.renderPage(token, showAll, dialog, datas, report, reg, update, roomIndex, billIndex, openThuchi)}
        <div class="version">client: {ver}</div>
        <div class="version">server: {sv}</div>
      </div>
    )
  }
}
