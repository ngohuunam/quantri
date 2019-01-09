import './style'
import { Component } from 'preact'
import myState from './state.js'

const apiVer = 3

const remote =
  process.env.NODE_ENV === 'production'
    ? 'https://busti.club/v' + apiVer + '/nhatro'
    : 'http://' + location.hostname + ':5000/v' + apiVer + '/nhatro'

export default class App extends Component {
  state = myState

  calculateMonths = year => {
    const _MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const DATE = new Date()
    const toDay = DATE.getDate()
    const monthIndex = DATE.getMonth()
    let currentMonth = monthIndex + toDay > 5 ? 1 : 0
    const currentYear = DATE.getFullYear()
    let MONTHS
    if (year === 2018) {
      if (toDay > 5) {
        MONTHS = _MONTHS.slice(8)
        currentMonth = 12
      } else {
        MONTHS = _MONTHS.slice(8, 11)
        currentMonth = 11
      }
    } else if (year === currentYear) MONTHS = _MONTHS.slice(0, currentMonth)
    else MONTHS = _MONTHS
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
    this.setState({ years: YEARS })
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
        this.setState({ [name]: Number(value) })
        break

      case 'tienchi':
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
      case 'out-btn':
      case 'purchase-btn':
        this.setState({ confirm: eventName.slice(0, -4) })
        break
      case 'ok-btn':
        this.confirmAction(this.state.confirm)
        break
      case 'reg-cancel-btn':
        this.setState({ onlyDeposit: false, reg: false })
        break
      case 'reg-btn':
        this.setState({
          reg: true,
          dien: 0,
          nuoc: 0,
        })
        break
      case 'bill-out-btn':
        this.confirmAction('update', 'out')
        break
      case 'bill-out-cancel-btn':
        this.confirmAction('update', 'cancel')
        break
      case 'deposited-btn':
      case 'in-btn':
        this.confirmAction(eventName.slice(0, -4))
        break
      case 'update-confirm-btn':
        this.confirmAction('update')
        break
      case 'update-cancel-btn':
        this.setState({ update: false })
        break
    }
  }

  confirmAction = (action, info) => {
    if (action) {
      const room = this.state.datas[this.state.roomIndex].room
      const body = JSON.stringify({
        room: room,
        action: action,
        token: this.state.token,
        name: this.state.name,
        phone: this.state.phone,
        email: this.state.email,
        dien: this.state.dien,
        nuoc: this.state.nuoc,
        nha: this.state.nha,
        month: this.state.month,
        year: this.state.year,
        deposit: this.state.deposit,
        onlyDeposit: this.state.onlyDeposit,
        khac: {
          khoan: this.state.thukhac,
          tien: typeof this.state.tienthukhac === 'number' ? this.state.tienthukhac : 0,
        },
        chi: {
          khoan: this.state.chi,
          tien: typeof this.state.tienchi === 'number' ? 0 - this.state.tienchi : 0,
        },
        preout: info,
      })
      console.log(body)
      this.setState({ loading: true, notice: 'Đang xác nhận...' })
      fetch(remote + '/chunha/action', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
      })
        .then(res => {
          this.setState({ loading: false, notice: 'Đang xử lý dữ liệu...' })
          if (res.status === 200) {
            res
              .json()
              .then(json => {
                console.log(json)
                const dataClone = this.state.datas.slice(0)
                dataClone[this.state.roomIndex].bills[0] = json
                this.setState({
                  datas: dataClone,
                  notice: '',
                  confirm: '',
                  newActive: json.new,
                  reg: false,
                  update: false,
                  onlyDeposit: false,
                  dien: json.dien,
                  nuoc: json.nuoc,
                })
              })
              .catch(e => this.setState({ notice: `Có lỗi: ${e.name}: ${e.message}` }))
          } else if (res.status === 406) {
            this.setState({ datas: [], token: '', notice: 'Auth reject' })
            localStorage.removeItem('adminToken')
          } else this.setState({ notice: 'Không có dữ liệu' })
        })
        .catch(e => this.setState({ notice: `Có lỗi: ${e.name}: ${e.message}` }))
    }
  }

  login = () => {
    if (this.state.sthChanged) {
      const body = JSON.stringify({
        room: '123',
        pass: this.state.pass,
        token: this.state.token,
        month: this.state.month,
        year: this.state.year,
      })
      console.log('fetch body', body)
      if (this.state.token) this.setState({ loading: true, notice: 'Đang tải dữ liệu...' })
      else this.setState({ loading: true, notice: 'Đang đăng nhập...' })
      fetch(remote + '/chunha', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
      })
        .then(res => {
          // console.log(res.status)
          this.setState({
            loading: false,
            notice: `Tải xong dữ liệu, đang chuyển trang`,
            dialog: false,
          })
          if (res.status === 200) {
            res
              .json()
              .then(json => {
                console.log(json)
                localStorage.setItem('adminToken', json.token)
                const LEN = process.env.NODE_ENV === 'production' ? 18 : 19
                // const LEN = 18
                this.setState({
                  datas: json.datas.slice(0, LEN),
                  token: json.token,
                  notice: '',
                  sthChanged: false,
                })
              })
              .catch(e => this.setState({ notice: `Có lỗi: ${e.name}: ${e.message}` }))
          } else if (res.status === 405) this.setState({ notice: 'Sai Mật khẩu' })
          else if (res.status === 406) {
            this.setState({
              datas: [],
              token: '',
              notice: 'Auth reject',
            })
            localStorage.removeItem('adminToken')
          } else this.setState({ notice: 'Không có dữ liệu' })
        })
        .catch(e => this.setState({ notice: `Có lỗi: ${e.name}: ${e.message}` }))
    }
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

  renderOtherFee = (thuchi, isChi) => {
    if (thuchi && thuchi.tien)
      return (
        <div class="total">
          <div>
            {isChi ? 'CHI' : 'THU'} {thuchi.khoan.toUpperCase()}
          </div>
          <div>{thuchi.tien.toLocaleString('vi')} đ</div>
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
    const thuchiString = d.bills[0].tongcong > 0 ? 'thu' : 'chi'
    const mess = `"OK" xác nhận đã ${thuchiString} tiền phòng ${d.room} tháng ${d.month}/${
      d.year
    } số tiền ${d.bills[0].tongcong.toLocaleString('vi')} đ`
    return (
      <div class="app">
        <h2>{mess}</h2>
        {this.renderButtons(['ok', 'cancel'], 'large', ['OK', 'HỦY'])}
        {this.renderLoading()}
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
      const btnClass = classNames && classNames.length ? classNames[idx] : classNames
      const text = texts[idx]
      return this.renderButton(name, btnClass, text, action, isDisabled)
    })
  }

  renderRoomButton = (bill, prev, next) => {
    const btnName = bill.out ? 'out' : 'purchase'
    const mainBtnStatus = this.buttonStatus(bill)
    const btnClass = mainBtnStatus.className
    const isDisabled = mainBtnStatus.disabled
    const btnText = mainBtnStatus.label
    const regBtnClass = !bill || bill.onlyDeposit || (bill && bill.out && bill.thanhtoan) ? '' : 'hidden'
    const depositBtnClass = !bill || (bill && bill.out && bill.thanhtoan && !bill.deposit) ? '' : 'hidden'
    const updateBtnClass = bill ? '' : 'hidden'
    const updateBtnAction = () =>
      this.setState({
        update: true,
        dien: bill.dien.sokynay || bill.dien.sokytruoc,
        nuoc: bill.nuoc.sokynay || bill.nuoc.sokytruoc,
        nha: '',
      })
    return (
      <div>
        {this.renderBill(bill)}
        <div class="btnGroup">
          {this.renderButtons(['prev', btnName, 'next'], ['', btnClass, ''], [prev.room, btnText, next.room], '', [
            false,
            isDisabled,
            false,
          ])}
        </div>
        {this.renderButtons(
          ['show-all', 'reg', 'deposit', 'update'],
          ['', regBtnClass, depositBtnClass, updateBtnClass],
          ['DANH SÁCH PHÒNG', 'NHẬN PHÒNG', 'ĐẶT CỌC', 'CẬP NHẬT'],
          ['', '', '', updateBtnAction],
          [false, false, false, bill.thanhtoan],
        )}
      </div>
    )
  }

  renderBills = (bills, prev, next) => {
    if (bills.length) return <div>{bills.map(bill => this.renderRoomButton(bill, prev, next))}</div>
    else return <div>{this.renderRoomButton(false, prev, next)}</div>
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
        {this.renderButton('report', 'mar-top-8px', `TỔNG HỢP THÁNG ${this.state.month} - ${this.state.year}`)}
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
        {this.renderLoading()}
      </div>
    )
  }

  renderLoading = () => {
    return (
      <div class="app">
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

  renderBillUpdate = () => {
    const billOutBtnInfo = this.state.datas[this.state.roomIndex].bills[0].out
      ? { name: 'bill-out-cancel', text: 'HUỶ TRẢ PHÒNG' }
      : { name: 'bill-out', text: 'TRẢ PHÒNG' }
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
        {this.renderButtons(['update-confirm', billOutBtnInfo.name, 'update-cancel'], '', ['CẬP NHẬT', billOutBtnInfo.text, 'QUAY LẠI'])}
        {this.renderLoading()}
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
        {this.renderLoading()}
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
        {this.renderLoading()}
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
    }
    datas.map(data => {
      data.bills.map(bill => {
        grandTotal.phaithu += bill.tongcong
        grandTotal.tiendien += bill.dien.thanhtien
        grandTotal.tiennuoc += bill.nuoc.thanhtien
        grandTotal.nuoctieuthu += bill.nuoc.tieuthu
        grandTotal.dientieuthu += bill.dien.tieuthu
        grandTotal.tiennha += bill.nha
      })
    })
    return grandTotal
  }

  renderReport = datas => {
    const flaternBills = []
    datas.map(data => data.bills.map(bill => flaternBills.push(bill)))
    return (
      <table class="tg">
        <tr class="bold header" onClick={() => this.setState({ dialog: true })}>
          <th colspan="20">
            <h4>
              TIỀN NHÀ THÁNG {this.state.month} - {this.state.year}
            </h4>
          </th>
        </tr>
        <tr class="bold">
          <th rowspan="2">PHÒNG</th>
          <th rowspan="2">TIỀN NHÀ</th>
          <th colspan="5">ĐIỆN</th>
          <th colspan="5">NƯỚC</th>
          <th rowspan="2">RÁC</th>
          <th rowspan="2">CỘNG</th>
          <th rowspan="2">XÁC NHẬN</th>
        </tr>
        <tr class="bold">
          <td>Kỳ trước</td>
          <td>Kỳ này</td>
          <td>Tiêu thụ</td>
          <td>Giá</td>
          <td>Thành tiền</td>
          <td>Kỳ trước</td>
          <td>Kỳ này</td>
          <td>Tiêu thụ</td>
          <td>Giá</td>
          <td>Thành tiền</td>
        </tr>
        {flaternBills.map((d, i) => {
          return (
            <tr key={i}>
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
              <td class="right bold">{d.tongcong.toLocaleString('vi')}</td>
              <td />
            </tr>
          )
        })}
        <tr class="bold header">
          <th colspan="2" onClick={() => window.print()}>
            <h4 class="no-print right">{this.calculateGrandTotal(datas).tiennha.toLocaleString('vi')}</h4>
          </th>
          <th colspan="2" onClick={() => window.print()} />
          <th colspan="1" onClick={() => window.print()}>
            <h4>{this.calculateGrandTotal(datas).dientieuthu.toLocaleString('vi')}</h4>
          </th>
          <th colspan="2" onClick={() => window.print()}>
            <h4 class="no-print right">{this.calculateGrandTotal(datas).tiendien.toLocaleString('vi')}</h4>
          </th>
          <th colspan="2" onClick={() => window.print()} />
          <th colspan="1" onClick={() => window.print()}>
            <h4>{this.calculateGrandTotal(datas).nuoctieuthu.toLocaleString('vi')}</h4>
          </th>
          <th colspan="2" onClick={() => window.print()}>
            <h4 class="no-print right">{this.calculateGrandTotal(datas).tiennuoc.toLocaleString('vi')}</h4>
          </th>
          <th colspan="2" onClick={() => window.print()}>
            <h4 class="no-print right">{this.calculateGrandTotal(datas).phaithu.toLocaleString('vi')}</h4>
          </th>
          <th onClick={() => this.setState({ report: false })}>
            <h4 class="no-print">{'<<<'}</h4>
          </th>
        </tr>
      </table>
    )
  }

  renderPage = (token, showAll, dialog, datas, report, reg, update) => {
    if (typeof window !== 'undefined') window.scroll(0, 0)
    if (token) {
      if (dialog) return this.renderSelectMonthYear()
      else if (report) return this.renderReport(datas)
      else {
        if (datas.length) {
          if (showAll) return this.renderListRooms(datas)
          else if (reg) return this.renderRegistration()
          else if (update) return this.renderBillUpdate()
          else return this.renderRoom(datas)
        } else return this.renderLoading()
      }
    } else return this.renderLogin()
  }

  render({}, { token, showAll, dialog, datas, report, reg, ver, update }) {
    return (
      <div>
        {this.renderPage(token, showAll, dialog, datas, report, reg, update)}
        <div class="version">{ver}</div>
      </div>
    )
  }
}
